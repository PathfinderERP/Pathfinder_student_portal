from tests.models import TestSubmission
from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Test, TestCentreAllotment
from .serializers import TestSerializer, TestListSerializer, TestCentreAllotmentSerializer
from sections.models import Section
from sections.serializers import SectionSerializer
from questions.serializers import QuestionSerializer
import random
import string
import re
import json

def clean_html(text):
    if not text: return ""
    return re.sub('<[^<]+?>', '', str(text)).strip().lower()


def invalidate_my_results_cache():
    from django.core.cache import cache
    try:
        cache.set('my_results_version', cache.get('my_results_version', 1) + 1, 86400)
    except Exception:
        pass


# --- Roster cache (admin Test list) ----------------------------------------
# Decoupled from `admin_test_list` so saving a single test doesn't trigger
# a full ERP rescan. The background refresher repopulates this; the list
# endpoint only ever reads from it.
ROSTER_CACHE_KEY = 'admin_test_roster_counts_v1'
ROSTER_FRESHNESS_KEY = 'admin_test_roster_counts_v1_fresh'  # short TTL = "needs refresh?" sentinel
ROSTER_LOCK_KEY = 'admin_test_roster_counts_v1_lock'


def _compute_roster_counts():
    """Compute {str(test_id): count} for every Test using the centre-keyed ERP index.

    O(C × students-per-C) per test instead of O(S × N_tests). Safe to call from
    a background thread — does not touch the request.
    """
    from django.db import close_old_connections
    from api.erp_views import get_centre_student_index
    from .models import Test
    from api.models import CustomUser

    close_old_connections()
    try:
        # Centre-keyed ERP index (block=False so a cold ERP fetch can't hang us).
        centre_idx = get_centre_student_index(force_refresh=False, block=False)
        if not centre_idx:
            return None

        tests = Test.objects.all().prefetch_related('centres')

        # Pre-bucket local students by uppercased centre name AND code, so we
        # avoid an extra DB query per test.
        local_by_centre = {}
        for u in CustomUser.objects.filter(user_type='student').only(
            'username', 'admission_number', 'email', 'centre_code', 'centre_name'
        ):
            uid = (u.username or str(u.pk)).upper().strip()
            adm = (u.admission_number or '').upper().strip()
            em = (u.email or '').lower().strip()
            dedupe = adm or em or uid
            if not dedupe:
                continue
            for key in filter(None, [
                (u.centre_code or '').upper().strip(),
                (u.centre_name or '').upper().strip(),
            ]):
                local_by_centre.setdefault(key, set()).add(dedupe)

        result = {}
        for t in tests:
            seen = set()
            for c in t.centres.all():
                c_name = (c.name or '').upper().strip()
                c_code = (c.code or '').upper().strip()

                # ERP students at this centre (centre-keyed reverse index).
                if c_name:
                    seen |= centre_idx.get(c_name, set())
                if c_code and c_code != c_name:
                    seen |= centre_idx.get(c_code, set())

                # Local DB students at this centre.
                if c_name:
                    seen |= local_by_centre.get(c_name, set())
                if c_code and c_code != c_name:
                    seen |= local_by_centre.get(c_code, set())

            result[str(t.pk)] = len(seen)

        from django.core.cache import cache
        cache.set(ROSTER_CACHE_KEY, result, 86400)         # 24h hard TTL
        cache.set(ROSTER_FRESHNESS_KEY, '1', 1800)         # 30 min "fresh" window
        print(f"[ROSTER] Refreshed counts for {len(result)} tests")
        return result
    except Exception as e:
        print(f"[ROSTER ERROR] {e}")
        return None
    finally:
        close_old_connections()


def _warm_test_paper_cache(test_id):
    """Pre-cache test paper data to avoid slow loads on first student request.
    
    Runs in background to avoid blocking user requests.
    Caches the complete test paper with all sections and questions for 60 minutes.
    """
    from django.core.cache import cache
    from django.db import close_old_connections
    from questions.models import Question
    
    close_old_connections()
    try:
        cache_key = f"test_paper_{test_id}"
        
        # Skip if already cached
        if cache.get(cache_key):
            print(f"[CACHE] Test paper {test_id} already cached, skipping warm-up")
            return
        
        try:
            test = Test.objects.select_related('exam_type').get(pk=test_id)
        except Test.DoesNotExist:
            print(f"[CACHE] Test {test_id} not found, cannot warm cache")
            return
        
        # Fetch sections
        sections = list(test.sections.all().order_by('priority'))
        
        # Fetch ALL questions for ALL sections in ONE query
        all_section_ids = [str(s.pk) for s in sections]
        all_questions = list(Question.objects.filter(
            section_id__in=all_section_ids
        ).select_related(
            'class_level', 'subject', 'chapter', 'topic',
            'exam_type', 'target_exam', 'test_name'
        ))
        
        # Build section->questions map
        section_q_map = {}
        for q in all_questions:
            sec_id = str(q.section_id)
            if sec_id not in section_q_map:
                section_q_map[sec_id] = []
            section_q_map[sec_id].append(q)
        
        # Build response
        sections_data = []
        from sections.serializers import SectionSerializer
        from questions.serializers import QuestionSerializer
        
        for section in sections:
            section_dict = SectionSerializer(section).data
            section_questions = section_q_map.get(str(section.pk), [])
            
            # Deduplicate and order
            seen_pks = set()
            unique_qs_list = []
            for q in section_questions:
                if str(q.pk) not in seen_pks:
                    seen_pks.add(str(q.pk))
                    unique_qs_list.append(q)
            
            order_list = section.question_order or []
            order_map = {str(oid): index for index, oid in enumerate(order_list)}
            unique_qs_list.sort(key=lambda q: order_map.get(str(q.pk), 999999))
            
            section_dict['questions_detail'] = QuestionSerializer(unique_qs_list, many=True).data
            sections_data.append(section_dict)
        
        response_data = {
            'test_name': test.name,
            'test_code': test.code,
            'duration': test.duration,
            'instructions': test.instructions,
            'sections': sections_data,
            'exam_type_name': test.exam_type.name if test.exam_type else None
        }
        
        # Cache for 60 minutes
        cache.set(cache_key, response_data, timeout=3600)
        print(f"[CACHE] Warmed test paper {test_id} with {len(sections)} sections and {len(all_questions)} questions")
        
    except Exception as e:
        print(f"[CACHE ERROR] Failed to warm test paper {test_id}: {e}")
    finally:
        close_old_connections()


def _trigger_roster_refresh():
    """Spawn a single-flight background thread to recompute roster counts.

    A small delay before the heavy work lets the parent request flush its
    response over the wire first. Without it, Python's GIL means the background
    thread immediately fights the request thread for CPU during serialization
    and the user perceives a slow response.
    """
    from django.core.cache import cache
    import threading
    if not cache.add(ROSTER_LOCK_KEY, '1', 300):  # 5 min single-flight window
        return
    def _bg():
        try:
            import time
            time.sleep(1.0)  # Yield ~1s so the calling response flushes first.
            _compute_roster_counts()
        finally:
            cache.delete(ROSTER_LOCK_KEY)
    t = threading.Thread(target=_bg, daemon=True)
    t.start()


def _build_admin_test_cache():
    """Build and store the admin_test_list cache without a live HTTP request.

    Replicates the staff branch of TestViewSet.list() so the first real admin
    page-load always hits a warm Redis cache rather than waiting minutes for
    a cold Djongo/MongoDB serialization pass.

    Call this from a background daemon thread in TestsConfig.ready().
    """
    from django.core.cache import cache
    from django.db.utils import DatabaseError
    from tests.models import Test
    from tests.serializers import TestListSerializer
    import rest_framework.request as drf_request
    import django.http

    cache_key = "admin_test_list"

    # Don't rebuild if another process already did it
    if cache.get(cache_key):
        print("[STARTUP] admin_test_list already warm — skipping rebuild.")
        return

    print("[STARTUP] Building admin_test_list cache…")
    try:
        # 1. Same queryset + prefetches as TestViewSet.list() for staff
        queryset = Test.objects.all().select_related(
            'session', 'exam_type', 'class_level', 'package'
        ).prefetch_related(
            'sections', 'target_exams', 'sessions', 'centres', 'class_levels',
            'centre_allotments', 'centre_allotments__centre'
        ).order_by('-created_at')

        # 2. Fake admin request so is_staff checks pass in SerializerMethodFields
        from django.contrib.auth import get_user_model
        User = get_user_model()
        admin_user = User.objects.filter(is_superuser=True).first() or \
                     User.objects.filter(is_staff=True).first()
        if admin_user is None:
            print("[STARTUP] No admin user found — cannot build admin cache.")
            return

        fake_http = django.http.HttpRequest()
        fake_http.method = 'GET'
        fake_http.META = {'SERVER_NAME': 'localhost', 'SERVER_PORT': '3001'}
        fake_request = drf_request.Request(fake_http)
        fake_request._user = admin_user
        fake_request._auth = None

        # Use a stub view with action='list' so SerializerMethodFields that guard
        # on view.action (get_total_roster_count, get_total_students, get_submission)
        # return 0 immediately — exactly what the real list() endpoint does.
        # The actual counts are injected via Mongo aggregation pipeline below.
        class _ListViewStub:
            action = 'list'

        ctx = {'request': fake_request, 'format': None, 'view': _ListViewStub()}

        # 3. Serialize with lightweight list serializer
        serializer = TestListSerializer(queryset, many=True, context=ctx)
        data_items = list(serializer.data)

        # 4. Inject Mongo aggregation counts (bulk, same as list() does)
        from api.db_utils import get_db
        from bson import ObjectId

        db = get_db()
        if db is not None:
            try:
                test_ids = []
                for item in data_items:
                    try:
                        test_ids.append(ObjectId(item.get('id')))
                    except Exception:
                        test_ids.append(item.get('id'))

                # Submission counts
                sub_pipeline = [
                    {"$match": {"test_id": {"$in": test_ids}}},
                    {"$group": {"_id": "$test_id", "count": {"$sum": 1}}}
                ]
                sub_counts = list(db['tests_testsubmission'].aggregate(sub_pipeline))
                count_map = {str(c["_id"]): c["count"] for c in sub_counts}
                for item in data_items:
                    item['total_students'] = count_map.get(str(item.get('id')), 0)

                # Roster from cache (roster refresh runs in a separate thread)
                roster_map = cache.get(ROSTER_CACHE_KEY) or {}
                for item in data_items:
                    item['total_roster_count'] = roster_map.get(str(item.get('id')), 0)

                # Failed OMR counts
                try:
                    omr_pipeline = [
                        {"$match": {"test_id": {"$in": test_ids}}},
                        {"$group": {"_id": "$test_id", "count": {"$sum": 1}}}
                    ]
                    omr_counts = list(db['tests_omrfailedrecord'].aggregate(omr_pipeline))
                    omr_map = {str(c["_id"]): c["count"] for c in omr_counts}
                    for item in data_items:
                        item['failed_omr_count'] = omr_map.get(str(item.get('id')), 0)
                except Exception as omr_e:
                    print(f"[STARTUP] OMR count error: {omr_e}")
                    for item in data_items:
                        item.setdefault('failed_omr_count', 0)

            except Exception as mongo_e:
                print(f"[STARTUP] Mongo aggregation error: {mongo_e}")

        # 5. Store — 30 min TTL matches the live endpoint
        cache.set(cache_key, data_items, 1800)
        print(f"[STARTUP] admin_test_list cache warmed ({len(data_items)} tests).")

    except DatabaseError as db_e:
        print(f"[STARTUP] DB error warming admin cache: {db_e}")
    except Exception as e:
        import traceback
        print(f"[STARTUP] Failed to warm admin_test_list: {e}")
        traceback.print_exc()
    finally:
        from django.db import close_old_connections
        close_old_connections()


class TestViewSet(viewsets.ModelViewSet):
    lookup_field = 'pk'
    serializer_class = TestSerializer

    def get_object(self):
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        pk = self.kwargs.get(lookup_url_kwarg)
        
        if pk and len(str(pk)) == 24:
            try:
                from api.db_utils import get_db
                from bson.objectid import ObjectId
                db = get_db()
                if db is not None:
                    doc = db['tests_test'].find_one({'_id': ObjectId(pk)})
                    if doc and 'id' in doc:
                        self.kwargs[lookup_url_kwarg] = doc['id']
            except Exception as e:
                print(f"ObjectId interception failed: {e}")
                
        return super().get_object()

    def get_serializer_class(self):
        # Use the lightweight list serializer (no description/instructions) for
        # the list action to reduce payload size and serialization overhead.
        if self.action == 'list':
            return TestListSerializer
        return TestSerializer

    def retrieve(self, request, *args, **kwargs):
        # PERFORMANCE: For the edit modal, bypass the heavy Djongo ORM + DRF serialization.
        # Direct MongoDB query drops the response time from ~1000ms to ~10ms.
        from api.db_utils import get_db
        db = get_db()
        test_id = self.kwargs.get(self.lookup_url_kwarg or self.lookup_field)
        
        try:
            if db is not None:
                from bson.objectid import ObjectId
                doc = db['tests_test'].find_one({'_id': ObjectId(test_id)}) if len(str(test_id)) == 24 else db['tests_test'].find_one({'id': int(test_id)})
                if doc:
                    test_id_int = doc.get('id')
                    
                    # Map ObjectIds back to integer ids for frontend dropdown compatibility
                    target_id_map = {str(t['_id']): str(t.get('id', t['_id'])) for t in db['master_data_targetexam'].find({})}
                    session_id_map = {str(s['_id']): str(s.get('id', s['_id'])) for s in db['master_data_session'].find({})}
                    class_id_map = {str(c['_id']): str(c.get('id', c['_id'])) for c in db['master_data_classlevel'].find({})}
                    exam_type_id_map = {str(e['_id']): str(e.get('id', e['_id'])) for e in db['master_data_examtype'].find({})}
                    centre_id_map = {str(c['_id']): str(c.get('id', c['_id'])) for c in db['tests_centre'].find({})}
                    
                    target_exams = [target_id_map.get(str(x['targetexam_id']), str(x['targetexam_id'])) for x in db['tests_test_target_exams'].find({'test_id': test_id_int})]
                    sessions = [session_id_map.get(str(x['session_id']), str(x['session_id'])) for x in db['tests_test_sessions'].find({'test_id': test_id_int})]
                    class_levels = [class_id_map.get(str(x['classlevel_id']), str(x['classlevel_id'])) for x in db['tests_test_class_levels'].find({'test_id': test_id_int})]
                    centres = [centre_id_map.get(str(x['centre_id']), str(x['centre_id'])) for x in db['tests_test_centres'].find({'test_id': test_id_int})]

                    data = {
                        'id': str(doc.get('_id')),
                        'name': doc.get('name', ''),
                        'code': doc.get('code', ''),
                        'duration': doc.get('duration', 0),
                        'total_marks': doc.get('total_marks', 0),
                        'description': doc.get('description', ''),
                        'instructions': doc.get('instructions', ''),
                        'is_completed': doc.get('is_completed', False),
                        'has_calculator': doc.get('has_calculator', False),
                        'option_type_numeric': doc.get('option_type_numeric', False),
                        'session': session_id_map.get(str(doc.get('session_id')), str(doc.get('session_id'))) if doc.get('session_id') else None,
                        'sessions': sessions,
                        'target_exams': target_exams,
                        'exam_type': exam_type_id_map.get(str(doc.get('exam_type_id')), str(doc.get('exam_type_id'))) if doc.get('exam_type_id') else None,
                        'class_level': class_id_map.get(str(doc.get('class_level_id')), str(doc.get('class_level_id'))) if doc.get('class_level_id') else None,
                        'class_levels': class_levels,
                        'centres': centres
                    }
                    from rest_framework.response import Response
                    return Response(data)
        except Exception as e:
            print(f"[FAST RETRIEVE ERROR] Falling back to standard serializer: {e}")
            
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        from rest_framework.response import Response
        return Response(serializer.data)

    def get_queryset(self):
        user = self.request.user
        
        # PERFORMANCE: Optimize queries based on action
        if self.action == 'list':
            # List view: prefetch all relations used by the serializer so every
            # obj.X.all() call is served from the prefetch cache, not a new DB hit.
            # 'sections' covers get_sections_count; 'centre_allotments__centre' covers
            # _get_user_allotment which iterates allotment.centre per test.
            queryset = Test.objects.all().select_related(
                'session', 'exam_type', 'class_level', 'package'
            ).prefetch_related(
                'sections', 'target_exams', 'sessions', 'centres', 'class_levels',
                'centre_allotments', 'centre_allotments__centre'
            ).order_by('-created_at')
        elif self.action in ['question_paper', 'retrieve']:
            # Detail view and question paper: bypass prefetch.
            # Prefetch doesn't work well with Djongo and takes ~0.75s for a single object.
            # Lazy loading relations for a single object is much faster (a few 1ms queries).
            queryset = Test.objects.all().select_related(
                'session', 'exam_type', 'class_level', 'package'
            ).order_by('-created_at')
        else:
            # Detail/Other views: standard relationships
            queryset = Test.objects.all().select_related(
                'session', 'exam_type', 'class_level', 'package'
            ).prefetch_related(
                'sections', 'target_exams', 'sessions', 'centres', 'class_levels',
                'centre_allotments', 'centre_allotments__centre'
            ).order_by('-created_at')
        
        # If user is a student, enforce smart visibility rules
        if not user.is_staff and not user.is_superuser and getattr(user, 'user_type', None) == 'student':
            from api.db_utils import parse_section, get_db
            db = get_db()
            
            # PASSIVE SYNC: Update user sections from the global ERP index if available.
            # This is now handled in the background to avoid blocking the main request cycle.
            if not getattr(user, 'exam_section', None) or not getattr(user, 'study_section', None):
                try:
                    import threading
                    from api.erp_views import get_student_lookup_index, _sync_user_to_erp
                    
                    def bg_passive_sync(u_id):
                        try:
                            from django.contrib.auth import get_user_model
                            U = get_user_model()
                            u = U.objects.get(pk=u_id)
                            index = get_student_lookup_index(force_refresh=False)
                            if index:
                                search_email = (u.email or u.username).strip().lower()
                                match = index.get(f"email_{search_email}") or index.get(f"adm_{u.username.upper().strip()}")
                                if match:
                                    _sync_user_to_erp(u, match)
                        except: pass
                    
                    t = threading.Thread(target=bg_passive_sync, args=(user.pk,))
                    t.daemon = True
                    t.start()
                except: pass

            # Guard against None values: str(None) → 'none' which would match incorrectly
            c_code = str(getattr(user, 'centre_code', '') or '').lower().strip()
            c_name = str(getattr(user, 'centre_name', '') or '').lower().strip()

            # Pre-fetch submission test IDs for this student (FAST)
            submission_test_ids = []
            if db is not None:
                try: 
                    mongo_student_ids = [user.pk, str(user.pk)]
                    try: mongo_student_ids.append(int(user.pk))
                    except: pass
                    try: 
                        from bson import ObjectId
                        mongo_student_ids.append(ObjectId(user.pk))
                    except: pass
                    
                    sub_docs = list(db['tests_testsubmission'].find({'student_id': {'$in': mongo_student_ids}}, {'test_id': 1}))
                    submission_test_ids = [d['test_id'] for d in sub_docs]
                except: pass

            # Optimized Filtering: Pre-compute all M2M matches as plain PK lists so the
            # final queryset uses ONLY simple pk__in conditions — no M2M JOINs, no DISTINCT.
            # Djongo emulates DISTINCT in Python (full scan + dedup), causing 7+ second
            # overhead. Replacing every M2M filter with a pre-fetched pk__in eliminates
            # that entirely and brings the main query down to a single indexed lookup.
            from django.db.models import Q
            from centres.models import Centre

            # 1. Centre filter: resolve matching centre IDs, then find tests that include them.
            centre_test_ids = []
            if c_code or c_name:
                matching_centre_ids = list(
                    Centre.objects.filter(
                        Q(code__iexact=c_code) | Q(name__iexact=c_name)
                    ).values_list('_id', flat=True)
                )
                if matching_centre_ids:
                    # One extra query, but avoids M2M JOIN + DISTINCT on the main queryset.
                    centre_test_ids = list(
                        Test.objects.filter(centres__in=matching_centre_ids).values_list('pk', flat=True)
                    )

            # 2. Academic filter: resolve target_exam and session via pre-computed PK lists.
            academic_test_ids = None  # None means "no academic restriction"
            if user.class_level:
                qs_academic = Test.objects.filter(class_level=user.class_level)
            else:
                # If the student has no class, only show tests that have NO class restriction
                qs_academic = Test.objects.filter(class_level__isnull=True)

            if user.target_exam:
                te_test_ids = list(
                    Test.objects.filter(target_exams=user.target_exam).values_list('pk', flat=True)
                )
                qs_academic = qs_academic.filter(pk__in=te_test_ids)

            if user.session:
                # Session: include STUDY PLANNER tests (any session) plus tests matching by FK or M2M.
                session_m2m_ids = list(
                    Test.objects.filter(sessions=user.session).values_list('pk', flat=True)
                )
                qs_academic = qs_academic.filter(
                    Q(exam_type__name__icontains='STUDY PLANNER') |
                    Q(exam_type__name__icontains='STUDY_PLANNER') |
                    Q(session=user.session) |
                    Q(pk__in=session_m2m_ids)
                )

            academic_test_ids = list(qs_academic.values_list('pk', flat=True))

            # 3. Combine: submitted tests  OR  (centre match AND academic match) — no DISTINCT needed.
            eligible_ids = set(str(pk) for pk in centre_test_ids) & set(str(pk) for pk in academic_test_ids)
            final_ids = list(set(str(pk) for pk in submission_test_ids) | eligible_ids)

            queryset = queryset.filter(pk__in=final_ids)

            # Hide OMR tests from students unless results are published.
            # Pre-compute unpublished OMR test IDs to bypass Djongo's SQL JOIN/double-negation translation bug in exclude() and boolean translation bugs.
            from master_data.models import ExamType
            omr_type_ids = list(ExamType.objects.filter(name__icontains='omr').values_list('pk', flat=True))
            
            # Fetch all OMR test IDs and their published status, then filter in python to avoid Djongo boolean bugs
            from django.db.models import Q
            all_omr_tests = Test.objects.filter(
                Q(exam_type_id__in=omr_type_ids) | Q(is_omr_based=True)
            ).values_list('pk', 'is_result_published')
            
            omr_unpublished_test_ids = [pk for pk, is_pub in all_omr_tests if not is_pub]
            queryset = queryset.exclude(pk__in=omr_unpublished_test_ids)
        
        package_id = self.request.query_params.get('package', None)
        if package_id:
            from bson import ObjectId
            try:
                queryset = queryset.filter(package_id=ObjectId(package_id))
            except Exception:
                queryset = queryset.none()
        return queryset

    def perform_create(self, serializer):
        instance = serializer.save()
        # Clear admin list cache (the categorizer now refreshes automatically via DB timestamp)
        from django.core.cache import cache
        cache.delete("admin_test_list")
        invalidate_my_results_cache()
        
        # Auto-create allotment records for centres
        for centre in instance.centres.all():
            TestCentreAllotment.objects.get_or_create(test=instance, centre=centre)

    def perform_update(self, serializer):
        instance = serializer.save()
        
        # Clear related caches
        from django.core.cache import cache
        cache.delete("admin_test_list")
        invalidate_my_results_cache()
        cache.delete(f"test_paper_{instance.pk}")
        
        # Clear related caches
        cache.delete(f"master_sections_v2_{self.request.user.pk}")
        cache.delete("master_sections_v2_public")
        
        # Get current allowed centres - safer fetching for Djongo/Mongo
        centres = list(instance.centres.all())
        current_centre_ids = [str(c.pk) for c in centres]
        
        # Sync allotments: find existing and delete what's no longer present
        existing_allotments = TestCentreAllotment.objects.filter(test=instance)
        
        # Delete stale allotments (those no longer in the centres list)
        existing_centre_ids = set()
        for allotment in existing_allotments:
            c_id = str(allotment.centre_id)
            if c_id not in current_centre_ids:
                allotment.delete()
            else:
                existing_centre_ids.add(c_id)

        # Create missing allotments for newly added centres via bulk
        new_allotments = []
        for centre in centres:
            if str(centre.pk) not in existing_centre_ids:
                new_allotments.append(TestCentreAllotment(test=instance, centre=centre))
                
        if new_allotments:
            TestCentreAllotment.objects.bulk_create(new_allotments)

    # Local burst protection for TestViewSet
    _local_cache = {}

    def list(self, request, *args, **kwargs):
        # Cache the test list for staff users (admin panel) to avoid heavy student count queries
        from django.core.cache import cache
        from api.erp_views import get_student_lookup_index
        from api.db_utils import get_db
        from time import time
        
        is_staff = request.user.is_staff or request.user.is_superuser
        is_student = getattr(request.user, 'user_type', '') == 'student'
        force_refresh = request.query_params.get('refresh', 'false').lower() == 'true'
        now = time()

        # Pre-fetch student submissions to avoid N+1 in serializer
        student_subs_map = {}
        if is_student:
            db = get_db()
            if db is not None:
                try:
                    mongo_student_ids = [request.user.pk, str(request.user.pk)]
                    try: mongo_student_ids.append(int(request.user.pk))
                    except: pass
                    try: 
                        from bson import ObjectId
                        mongo_student_ids.append(ObjectId(request.user.pk))
                    except: pass
                    
                    subs = list(db['tests_testsubmission'].find(
                        {'student_id': {'$in': mongo_student_ids}},
                        {'test_id': 1, 'is_finalized': 1, 'allow_resume': 1, 'time_spent': 1, 'submitted_at': 1, 'updated_at': 1, 'score': 1}
                    ))
                    student_subs_map = {str(s['test_id']): s for s in subs}
                except: pass
        
        if is_staff and force_refresh:
            # Global purge of ERP student cache and index - do in background to not block UI
            import threading
            cache.delete("admin_test_list")
            self.__class__._local_cache = {} # Clear local burst cache
            
            def bg_erp_sync():
                try:
                    get_student_lookup_index(force_refresh=True)
                except Exception as e:
                    print(f"Background ERP Sync Error: {e}")
            
            thread = threading.Thread(target=bg_erp_sync)
            thread.daemon = True
            thread.start()

        if is_staff and not force_refresh:
            cache_key = "admin_test_list"
            
            # 1. Burst protection (Local memory)
            local_entry = self.__class__._local_cache.get(cache_key)
            if local_entry and (now - local_entry['time'] < 5):
                return Response(local_entry['data'])

            # 2. Redis/Cache
            cached_data = cache.get(cache_key)
            if cached_data:
                self.__class__._local_cache[cache_key] = {'data': cached_data, 'time': now}
                return Response(cached_data)
        
        # Inject pre-fetched submissions into context
        serializer_context = self.get_serializer_context()
        if student_subs_map:
            serializer_context['student_submissions'] = student_subs_map

        # We override super().list logic slightly to use our context
        queryset = self.filter_queryset(self.get_queryset())
        
        # --- STUDENT LOGIC REMAINS DRF ---
        if not is_staff:
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True, context=serializer_context)
                return self.get_paginated_response(serializer.data)
            serializer = self.get_serializer(queryset, many=True, context=serializer_context)
            return Response(serializer.data)
            
        # --- STAFF LOGIC REWRITTEN TO NATIVE PYMONGO FOR 100x SPEED ---
        from api.db_utils import get_db
        db = get_db()
        data_items = []
        
        if db is not None:
            try:
                # 1. Fetch Master Dictionaries in 4 fast queries mapping both ObjectIds and integer ids
                session_map = {}
                for s in db['master_data_session'].find({}):
                    name = s.get('name', '')
                    session_map[str(s['_id'])] = name
                    if 'id' in s: session_map[str(s['id'])] = name
                    
                exam_type_map = {}
                for e in db['master_data_examtype'].find({}):
                    name = e.get('name', '')
                    exam_type_map[str(e['_id'])] = name
                    if 'id' in e: exam_type_map[str(e['id'])] = name
                    
                class_map = {}
                for c in db['master_data_classlevel'].find({}):
                    name = c.get('name', '')
                    class_map[str(c['_id'])] = name
                    if 'id' in c: class_map[str(c['id'])] = name
                    
                target_map = {}
                for t in db['master_data_targetexam'].find({}):
                    name = t.get('name', '')
                    target_map[str(t['_id'])] = name
                    if 'id' in t: target_map[str(t['id'])] = name

                # 2. Fetch all tests natively, ordered by created_at DESC
                tests_cursor = db['tests_test'].find({}).sort('created_at', -1)
                
                # Fetch M2M mappings in bulk
                target_mappings = {}
                for t in db['tests_test_target_exams'].find({}):
                    target_mappings.setdefault(t['test_id'], []).append(str(t['targetexam_id']))
                
                session_mappings = {}
                for s in db['tests_test_sessions'].find({}):
                    session_mappings.setdefault(s['test_id'], []).append(str(s['session_id']))
                    
                class_mappings = {}
                for c in db['tests_test_class_levels'].find({}):
                    class_mappings.setdefault(c['test_id'], []).append(str(c['classlevel_id']))
                    
                centre_mappings = {}
                for c in db['tests_test_centres'].find({}):
                    centre_mappings.setdefault(c['test_id'], []).append(str(c['centre_id']))
                
                for doc in tests_cursor:
                    test_id = doc.get('id')
                    
                    item = {
                        'id': test_id,
                        'name': doc.get('name', ''),
                        'code': doc.get('code', ''),
                        'duration': doc.get('duration', 0),
                        'total_marks': doc.get('total_marks', 0),
                        'is_completed': doc.get('is_completed', False),
                        'is_omr_based': doc.get('is_omr_based', False),
                        'is_result_published': doc.get('is_result_published', False),
                        'created_at': doc.get('created_at'),
                        
                        # Primitive IDs (for backwards compatibility)
                        'session': str(doc.get('session_id')) if doc.get('session_id') else None,
                        'exam_type': str(doc.get('exam_type_id')) if doc.get('exam_type_id') else None,
                        'class_level': str(doc.get('class_level_id')) if doc.get('class_level_id') else None,
                        
                        # Direct Dictionary References
                        'session_details': {'name': session_map.get(str(doc.get('session_id')), '')} if doc.get('session_id') else None,
                        'exam_type_details': {'name': exam_type_map.get(str(doc.get('exam_type_id')), '')} if doc.get('exam_type_id') else None,
                        'class_level_details': {'name': class_map.get(str(doc.get('class_level_id')), '')} if doc.get('class_level_id') else None,
                        
                        # Arrays of details mapped instantly
                        'sessions_details': [{'name': session_map.get(s, '')} for s in session_mappings.get(test_id, []) if s in session_map],
                        'class_levels_details': [{'name': class_map.get(c, '')} for c in class_mappings.get(test_id, []) if c in class_map],
                        'target_exam_details': [{'name': target_map.get(t, '')} for t in target_mappings.get(test_id, []) if t in target_map],
                        
                        'sessions': session_mappings.get(test_id, []),
                        'class_levels': class_mappings.get(test_id, []),
                        'target_exams': target_mappings.get(test_id, []),
                        'centres': centre_mappings.get(test_id, []),
                        'centres_count': len(centre_mappings.get(test_id, [])),
                        
                        # Default counts
                        'total_students': 0,
                        'total_roster_count': 0,
                        'failed_omr_count': 0
                    }
                    data_items.append(item)

                # 3. Inject Aggregation Counts
                if len(data_items) > 0:
                    test_ids = [item['id'] for item in data_items]
                    
                    # Attempts count
                    pipeline = [
                        {"$match": {"test_id": {"$in": test_ids}}},
                        {"$group": {"_id": "$test_id", "count": {"$sum": 1}}}
                    ]
                    counts = list(db['tests_testsubmission'].aggregate(pipeline))
                    count_map = {item["_id"]: item["count"] for item in counts}
                    for item in data_items:
                        item['total_students'] = count_map.get(item['id'], 0)
                        
                    # Failed OMR count
                    try:
                        failed_counts = list(db['tests_omrfailedrecord'].aggregate(pipeline))
                        failed_count_map = {item["_id"]: item["count"] for item in failed_counts}
                        for item in data_items:
                            item['failed_omr_count'] = failed_count_map.get(item['id'], 0)
                    except Exception: pass

                # 4. Inject Roster Counts (from background cache)
                roster_map = cache.get(ROSTER_CACHE_KEY) or {}
                for item in data_items:
                    item['total_roster_count'] = roster_map.get(str(item['id']), 0)

                if not roster_map or cache.get(ROSTER_FRESHNESS_KEY) is None:
                    _trigger_roster_refresh()

            except Exception as e:
                print(f"List Optimization Error: {e}")

        response = Response(data_items)
        
        # Cache the assembled list response
        cache.set("admin_test_list", data_items, 1800)
        self.__class__._local_cache["admin_test_list"] = {'data': data_items, 'time': now}

        return response

    def destroy(self, request, *args, **kwargs):
        from django.core.cache import cache
        cache.delete("admin_test_list")
        self.__class__._local_cache = {}
        invalidate_my_results_cache()
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['get'])
    def sections(self, request, pk=None):
        from api.db_utils import get_db
        db = get_db()
        
        if db is not None:
            try:
                # 1. Resolve test ID
                from bson import ObjectId
                test_query = {}
                try:
                    test_query = {'id': int(pk)}
                except (ValueError, TypeError):
                    test_query = {'_id': ObjectId(pk)}
                    
                test_doc = db['tests_test'].find_one(test_query, {'_id': 1, 'id': 1})
                if not test_doc:
                    return Response({'detail': 'Test not found'}, status=404)
                    
                test_id_obj = test_doc['_id']
                test_id_int = test_doc.get('id')
                
                # 2. Fetch Sections
                sections_cursor = db['sections_section'].find({'test_id': test_id_int}).sort([('priority', 1), ('created_at', 1)])
                sections_list = list(sections_cursor)
                
                # 3. Bulk fetch questions in ONE query instead of N+1
                section_ids = [s['_id'] for s in sections_list]
                sq_map = {}
                if section_ids:
                    junctions = db['sections_section_questions'].find({'section_id': {'$in': section_ids}})
                    for j in junctions:
                        sid = str(j['section_id'])
                        qid = str(j['question_id'])
                        if sid not in sq_map:
                            sq_map[sid] = set()
                        sq_map[sid].add(qid)
                
                # 4. Construct payload identical to SectionSerializer
                data = []
                for s in sections_list:
                    s_id = str(s['_id'])
                    item = {
                        'id': s_id,
                        'test': test_id_int,
                        'name': s.get('name', ''),
                        'subject_code': s.get('subject_code', 'GEN'),
                        'total_questions': s.get('total_questions', 20),
                        'allowed_questions': s.get('allowed_questions', 20),
                        'shuffle': s.get('shuffle', False),
                        'question_type': s.get('question_type', 'SINGLE_CHOICE'),
                        'correct_marks': s.get('correct_marks', 4.0),
                        'negative_marks': s.get('negative_marks', 1.0),
                        'partial_type': s.get('partial_type', 'regular'),
                        'partial_marks': s.get('partial_marks', 0.0),
                        'partial_mark_rule': str(s.get('partial_mark_rule_id')) if s.get('partial_mark_rule_id') else None,
                        'priority': s.get('priority', 1),
                        'questions': list(sq_map.get(s_id, [])),
                        'created_at': s.get('created_at'),
                        'updated_at': s.get('updated_at')
                    }
                    data.append(item)
                return Response(data)
                
            except Exception as e:
                print(f"PyMongo Sections error: {e}")
                pass
                
        # Fallback to DRF (slow path)
        try:
            test = Test.objects.get(pk=pk)
        except Test.DoesNotExist:
            try:
                test = Test.objects.get(_id=pk)
            except:
                return Response({'detail': 'Test not found'}, status=404)
                
        sections = test.sections.all()
        serializer = SectionSerializer(sections, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def centres(self, request, pk=None):
        try:
            # Use direct model lookup to bypass potentially restrictive get_queryset
            test = Test.objects.get(pk=pk)
        except Test.DoesNotExist:
            return Response({'detail': 'Test not found'}, status=status.HTTP_404_NOT_FOUND)
            
        from django.core.cache import cache
        force_refresh = request.query_params.get('refresh', 'false').lower() == 'true'
        
        cache_key = f"test_{test.pk}_centers_full_v3"
        if not force_refresh:
            cached_data = cache.get(cache_key)
            if cached_data:
                return Response(cached_data)

        from api.models import CustomUser
        from .models import TestSubmission
        from centres.models import Centre
        from api.db_utils import get_db, parse_section
        from api.db_utils import get_db, parse_section
        from api.erp_views import get_student_lookup_index # Optimized indexing
        
        db = get_db()
        
        # 1. Fetch ALL allotted allotments
        all_allotments = list(test.centre_allotments.all().select_related('centre'))
        allotted_centres_map = {str(a.centre_id): a for a in all_allotments}
        allotted_centre_ids = list(allotted_centres_map.keys())
        
        # 2. Pre-fetch ALL submissions for this test
        all_subs_list = []
        if db is not None:
            try:
                from bson import ObjectId
                try:
                    t_pk = ObjectId(test.pk)
                except:
                    t_pk = test.pk
                sub_docs = list(db['tests_testsubmission'].find({'test_id': t_pk}, {'student_id': 1}))
                if sub_docs:
                    student_pks = [d['student_id'] for d in sub_docs]
                    # Fetch student centre info and names for mapping natively
                    users_cursor = db['api_customuser'].find(
                        {'_id': {'$in': student_pks}},
                        {'_id': 1, 'username': 1, 'admission_number': 1, 'email': 1, 'centre_code': 1, 'centre_name': 1}
                    )
                    for u in users_cursor:
                        pk_str = str(u['_id'])
                        all_subs_list.append({
                            'pk': pk_str,
                            'uid': str(u.get('username') or pk_str).upper().strip(),
                            'adm': u.get('admission_number'),
                            'email': u.get('email'),
                            'c_code': str(u.get('centre_code') or '').lower().strip(),
                            'c_name': str(u.get('centre_name') or '').lower().strip()
                        })
            except Exception as e:
                print(f"PyMongo bypass error in 'centres': {e}")
        # PERFORMANCE FIX: Removed expensive global ERP and local student iteration.
        # Now only displays actual submissions, drastically improving response time.

        # 3. Identify Extra Centres (not allotted but have submissions)
        extra_centres = []
        if all_subs_list:
            sub_c_codes = {d['c_code'] for d in all_subs_list if d['c_code']}
            sub_c_names = {d['c_name'] for d in all_subs_list if d['c_name']}
            if sub_c_codes or sub_c_names:
                from django.db.models import Q
                extra_centres = list(Centre.objects.filter(
                    Q(code__in=sub_c_codes) | Q(name__in=sub_c_names)
                ).exclude(pk__in=allotted_centre_ids))

        # 4. Process all students and map to centres
        all_target_centres = [a.centre for a in all_allotments] + extra_centres
        centre_counts = {str(c.pk): {'sub': 0, 'roster': 0} for c in all_target_centres}
        
        unassigned_sub_count = 0
        
        # A. Assign Submitted Students
        for sub in all_subs_list:
            assigned = False
            for c in all_target_centres:
                if sub['c_code'] == str(c.code).lower().strip() or sub['c_name'] == str(c.name).lower().strip():
                    centre_counts[str(c.pk)]['sub'] += 1
                    assigned = True; break
            
            if not assigned:
                unassigned_sub_count += 1

        # 5. Format Data
        from .serializers import TestCentreAllotmentSerializer
        from centres.serializers import CentreSerializer
        data = []
        for c in all_target_centres:
            c_id = str(c.pk)
            allotment = allotted_centres_map.get(c_id)
            if allotment:
                serialized = TestCentreAllotmentSerializer(allotment).data
            else:
                serialized = {
                    'id': f"extra-{c_id}", 'test': str(test.pk), 'centre': c_id,
                    'centre_details': CentreSerializer(c).data, 'is_active': False, 'test_name': test.name
                }
            serialized['submission_count'] = centre_counts[c_id]['sub']
            serialized['total_students_in_centre'] = centre_counts[c_id]['sub']
            data.append(serialized)

        if unassigned_sub_count > 0:
            data.append({
                'id': 'unassigned-row', 'test': str(test.pk), 'centre': None,
                'centre_details': {'pk': None, 'code': 'N/A', 'name': 'Unassigned / System Entries'},
                'is_active': False, 'test_name': test.name, 'submission_count': unassigned_sub_count,
                'total_students_in_centre': unassigned_sub_count
            })
            
        # Cache the result for 5 minutes (300 seconds) to ensure immediate UX and reduce loads
        cache.set(cache_key, data, 300)
            
        return Response(data)

    @action(detail=True, methods=['get'], url_path='status')
    def status(self, request, pk=None):
        test = self.get_object()
        user = request.user
        from .models import TestSubmission
        sub = TestSubmission.objects.filter(test=test, student=user).first()
        if not sub:
            return Response({'status': 'available', 'is_finalized': False, 'allow_resume': True})
        return Response({
            'status': 'submitted' if sub.is_finalized else 'in_progress',
            'is_finalized': sub.is_finalized,
            'allow_resume': sub.allow_resume,
            'responses': sub.responses,
            'time_spent': sub.time_spent,
            'submission_type': sub.submission_type
        })

    @action(detail=True, methods=['post'], url_path='start_exam')
    def start_exam(self, request, pk=None):
        test = self.get_object()
        user = request.user
        from .models import TestSubmission


        # DJONGO WORKAROUND: Use update() to avoid duplicate key errors during save() for existing submissions
        # and handle race conditions during creation across parallel requests.
        updated = TestSubmission.objects.filter(test=test, student=user).update(allow_resume=True)
        
        if not updated:
            try:
                TestSubmission.objects.create(test=test, student=user, allow_resume=True)
            except:
                # Race condition: someone created it just now
                TestSubmission.objects.filter(test=test, student=user).update(allow_resume=True)

        return Response({'success': True})

    @action(detail=True, methods=['post'], url_path='submit')
    def submit(self, request, pk=None):
        test = self.get_object()
        user = request.user
        responses = request.data.get('responses', {})
        time_spent = request.data.get('time_spent', 0)
        sub_type = request.data.get('submission_type', 'MANUAL')
        
        from .models import TestSubmission
        sub, created = TestSubmission.objects.get_or_create(test=test, student=user)
        
        if sub.is_finalized:
            return Response({'error': 'Already submitted'}, status=403)
            
        sub.responses = responses
        sub.time_spent = time_spent
        sub.submission_type = sub_type
        sub.is_finalized = True
        sub.allow_resume = False 
        sub.save()
        return Response({'status': 'submitted'})

    @action(detail=True, methods=['get'], url_path='submissions')
    def submissions(self, request, pk=None):
        from .models import TestSubmission
        from api.models import CustomUser
        from api.erp_views import get_student_lookup_index
        from centres.models import Centre
        from api.db_utils import get_db, parse_section
        from django.core.cache import cache
        from types import SimpleNamespace

        test = self.get_object()
        centre_code = request.query_params.get('centre_code')
        force_refresh = request.query_params.get('refresh', 'false').lower() == 'true'
        
        if not centre_code:
            return Response({'detail': 'centre_code is required'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Fetch ALL relevant allotments and estable priority (Must match 'centres' action)
        all_allotments = list(test.centre_allotments.all().select_related('centre'))
        allotted_centre_ids = [str(a.centre_id) for a in all_allotments]
        
        # 2. Pre-fetch submissions to handle Extras and correctly map counts
        db = get_db()
        all_subs_list = []
        if db is not None:
            try:
                from bson import ObjectId
                try:
                    t_pk = ObjectId(test.pk)
                except:
                    t_pk = test.pk
                sub_docs = list(db['tests_testsubmission'].find({'test_id': t_pk}))
                if sub_docs:
                    sub_pks = [d['student_id'] for d in sub_docs]
                    users_cursor = db['api_customuser'].find(
                        {'_id': {'$in': sub_pks}},
                        {'_id': 1, 'username': 1, 'admission_number': 1, 'email': 1, 'centre_code': 1, 'centre_name': 1, 'first_name': 1, 'last_name': 1, 'exam_section': 1, 'study_section': 1}
                    )
                    users_map = {str(u['_id']): u for u in users_cursor}
                    for sd in sub_docs:
                        sid_str = str(sd['student_id'])
                        u = users_map.get(sid_str)
                        if u:
                            all_subs_list.append({
                                'doc': sd, 'pk': str(u['_id']), 'uid': str(u.get('username') or sid_str).upper().strip(),
                                'adm': u.get('admission_number'), 'email': u.get('email'),
                                'c_code': str(u.get('centre_code') or '').lower().strip(),
                                'c_name': str(u.get('centre_name') or '').lower().strip()
                            })
            except Exception as e:
                print(f"PyMongo error in submissions: {e}")

        # Identitfy Extra Centres (same as centres action)
        extra_centres = []
        if all_subs_list:
            sub_c_codes = {d['c_code'] for d in all_subs_list if d['c_code']}
            sub_c_names = {d['c_name'] for d in all_subs_list if d['c_name']}
            if sub_c_codes or sub_c_names:
                extra_centres = list(Centre.objects.filter(
                    Q(code__in=sub_c_codes) | Q(name__in=sub_c_names)
                ).exclude(pk__in=allotted_centre_ids))

        all_target_centres = [a.centre for a in all_allotments] + extra_centres
        
        # 3. Establish the requested target for filtering
        target_c_obj = None
        if centre_code != 'N/A':
            target_c_obj = next((c for c in all_target_centres if str(c.code).lower() == centre_code.lower()), None)
            if not target_c_obj:
                target_c_obj = Centre.objects.filter(code__iexact=centre_code).first()

        # 4. Replicate Global Prioritized Mapping
        global_seen_uids = set()
        final_list = []
        
        # Tracking student submissions (for data enrichment)
        # We also need a fast map for finalized status etc.
        sub_map = {str(s['pk']): s['doc'] for s in all_subs_list}

        # PERFORMANCE FIX: Removed ERP index completely.

        # Step A: Assigned Submitted Students
        for sub in all_subs_list:
            assigned_c_pk = None
            for c in all_target_centres:
                if sub['c_code'] == str(c.code).lower().strip() or sub['c_name'] == str(c.name).lower().strip():
                    assigned_c_pk = str(c.pk)
                    break
            
            captured = False
            if assigned_c_pk:
                if target_c_obj and assigned_c_pk == str(target_c_obj.pk): captured = True
            elif centre_code == 'N/A': captured = True
            
            if captured:
                u_obj = users_map.get(str(sub['pk']))
                
                global_seen_uids.add(sub['uid'])
                if sub['adm']: global_seen_uids.add(sub['adm'].upper().strip())
                if sub['email']: global_seen_uids.add(sub['email'].lower().strip())
                final_list.append((u_obj, False))

        # PERFORMANCE FIX: Removed Step B (Local Students) and Step C (ERP Students).
        # We now only return students who actually started or submitted the test.

        # 5. Format and Enrich Final Response
        data = []
        for item in final_list:
            s, is_mis = item if isinstance(item, tuple) else (item, False)
            if not s: continue
            
            uid_str = str(s['_id']) if s.get('_id') else None
            sub = sub_map.get(uid_str) if uid_str else None
            
            # PERFORMANCE FIX: Removed ERP enrichment completely to prevent latency spikes.
            # Using local student data which we already have in the database.
            enroll = str(s.get('admission_number') or 'ID MISSING').upper().strip()
            section = str(s.get('exam_section', '') or s.get('study_section', '') or '—').upper().strip()
            
            data.append({
                'id': str(sub['_id']) if sub else None,
                'student_id': uid_str,
                'student_name': (f"{s.get('first_name', '')} {s.get('last_name', '')}".strip() or s.get('username', '')).upper(),
                'username': s.get('username'), 'email': s.get('email'), 'enroll_number': enroll, 'section': section,
                'score': sub.get('score') if sub else None,
                'submission_type': sub.get('submission_type') if sub else None,
                'time_spent': sub.get('time_spent', 0) if sub else 0,
                'submitted_at': sub.get('submitted_at').isoformat() if sub and hasattr(sub.get('submitted_at'), 'isoformat') else None,
                'status': 'Submitted' if sub and sub.get('is_finalized') else ('In Progress' if sub else 'Available'),
                'allow_resume': sub.get('allow_resume', False) if sub else False,
                'is_finalized': sub.get('is_finalized', False) if sub else False
            })

        return Response({'allotted_sections': [], 'data': data})

    @action(detail=True, methods=['post'], url_path='force_publish')
    def force_publish(self, request, pk=None):
        """
        Forcefully marks a test as completed and publishes results,
        bypassing is_over deadline checks.
        """
        test = self.get_object()
        
        # Force complete and publish
        test.is_completed = True
        test.is_result_published = True
        test.save()
        
        # Clear related caches
        from django.core.cache import cache
        cache.delete("admin_test_list")
        invalidate_my_results_cache()
        
        return Response({
            'message': 'Test results forcefully published successfully.',
            'is_completed': True,
            'is_result_published': True
        })

    @action(detail=True, methods=['post'], url_path='upload_omr_excel')
    def upload_omr_excel(self, request, pk=None):
        """
        Partial-save OMR upload:
        - Matched students  → saved to TestSubmission immediately.
        - Unmatched students → stored in OMRFailedRecord so admin can edit+retry.
        Any previous OMRFailedRecord entries for this test are cleared on each new upload.
        """
        try:
            import pandas as pd
            from django.db.models import Q
            from .models import TestSubmission, OMRFailedRecord
            from api.models import CustomUser
            from api.erp_views import get_student_lookup_index

            test = self.get_object()
            file = request.FILES.get('file')
            replace_existing = request.POST.get('replace_existing') == 'true'
            if not file:
                return Response({'error': 'No file uploaded'}, status=400)

            if file.name.endswith('.csv'):
                df = pd.read_csv(file)
            else:
                df = pd.read_excel(file)

            original_columns = list(df.columns)
            df.columns = [str(c).strip().lower() for c in df.columns]

            # --- HIGH PERFORMANCE PREFETCHING ---
            enroll_col = next((c for c in ['frmid', 'enrollment number', 'enrollment', 'admission number', 'admission', 'student id', 'id', 'username'] if c in df.columns), None)
            if not enroll_col:
                return Response({'error': f'Could not find enrollment column in sheet. Found: {original_columns}'}, status=400)

            raw_enrolls = []
            for val in df[enroll_col]:
                if pd.isna(val): continue
                enroll = str(val).strip().upper()
                if enroll.endswith('.0'): enroll = enroll[:-2]
                if enroll.isdigit(): enroll = f"PATH{enroll}"
                if enroll: raw_enrolls.append(enroll)

            existing_users_qs = CustomUser.objects.filter(Q(admission_number__in=raw_enrolls) | Q(username__in=raw_enrolls))
            existing_user_map = {}
            for u in existing_users_qs:
                if u.admission_number: existing_user_map[u.admission_number.upper()] = u
                if u.username: existing_user_map[u.username.upper()] = u

            erp_idx = get_student_lookup_index(force_refresh=False, block=False) or {}

            existing_subs_qs = TestSubmission.objects.filter(test=test, student__in=existing_users_qs)
            existing_sub_map = {s.student_id: s for s in existing_subs_qs}
            # ----------------------------------------

            is_omr_raw = 'frmid' in df.columns or 'f001' in df.columns
            failed_rows = []   # list of { original_enrollment, raw_data }
            seen_enrollments = set()
            validated_rows = []

            def _resolve_student(enroll_raw, row_num):
                """Try to find or auto-create a student. Returns (student|None, error_msg|None)."""
                student = existing_user_map.get(enroll_raw)
                if not student:
                    erp_record = erp_idx.get(f"adm_{enroll_raw}")
                    if erp_record:
                        try:
                            student_obj = erp_record.get('student') or {}
                            details_list = student_obj.get('studentsDetails', [])
                            email = ""
                            first_name = "Student"
                            last_name = ""
                            if details_list and isinstance(details_list, list) and len(details_list) > 0:
                                email = details_list[0].get('studentEmail', '')
                                name = details_list[0].get('studentName', '')
                                if name:
                                    parts = name.strip().split(' ')
                                    first_name = parts[0]
                                    last_name = ' '.join(parts[1:]) if len(parts) > 1 else ''
                            username = email if email else enroll_raw
                            student = existing_user_map.get(username.upper())
                            if not student:
                                student = CustomUser.objects.create(
                                    username=username, email=email, admission_number=enroll_raw,
                                    user_type='student', first_name=first_name, last_name=last_name
                                )
                                existing_user_map[enroll_raw] = student
                                existing_user_map[username.upper()] = student
                        except Exception as e:
                            print(f"Auto-sync failed for {enroll_raw}: {e}")
                            student = None
                if not student:
                    return None, f"Row {row_num}: Student not found with enrollment '{enroll_raw}'."
                return student, None

            if is_omr_raw:
                questions = []
                for section in test.sections.prefetch_related('questions').order_by('priority'):
                    seen = set()
                    order_list = section.question_order or []
                    order_map = {str(oid): i for i, oid in enumerate(order_list)}
                    sec_qs = []
                    for q in section.questions.all():
                        if str(q.pk) not in seen:
                            seen.add(str(q.pk))
                            sec_qs.append(q)
                    sec_qs.sort(key=lambda q: order_map.get(str(q.pk), 999999))
                    questions.extend(sec_qs)

                for index, row in df.iterrows():
                    row_num = index + 2
                    if pd.isna(row[enroll_col]): continue

                    enroll_raw = str(row[enroll_col]).strip().upper()
                    if enroll_raw.endswith('.0'): enroll_raw = enroll_raw[:-2]
                    if enroll_raw.isdigit(): enroll_raw = f"PATH{enroll_raw}"

                    if enroll_raw in seen_enrollments:
                        continue   # skip duplicates silently
                    seen_enrollments.add(enroll_raw)

                    student, err = _resolve_student(enroll_raw, row_num)
                    if not student:
                        # Build raw_data from all f-columns
                        raw_data = {}
                        for i in range(1, len(questions) + 1):
                            col = f"f{i:03d}"
                            if col in df.columns:
                                val = row[col]
                                if not pd.isna(val):
                                    raw_data[col] = str(val).strip().upper()
                        failed_rows.append({'original_enrollment': enroll_raw, 'raw_data': raw_data, 'sheet_type': 'raw', 'row_num': row_num})
                        continue

                    responses = {}
                    for i, q in enumerate(questions):
                        col_name = f"f{i+1:03d}"
                        if col_name in df.columns:
                            ans_val = row[col_name]
                            if pd.isna(ans_val): continue
                            ans_str = str(ans_val).strip().upper()
                            if ans_str in ('NAN', 'NONE', '', 'NULL'): continue
                            options = q.question_options or []
                            ans_list = []
                            for char in ans_str:
                                if 'A' <= char <= 'Z':
                                    idx = ord(char) - ord('A')
                                    if 0 <= idx < len(options): ans_list.append(str(options[idx].get('id', '')))
                                elif '1' <= char <= '9':
                                    idx = int(char) - 1
                                    if 0 <= idx < len(options): ans_list.append(str(options[idx].get('id', '')))
                            if ans_list:
                                if q.question_type == 'SINGLE_CHOICE':
                                    responses[str(q.pk)] = {'answer': ans_list[0]}
                                else:
                                    responses[str(q.pk)] = {'answer': ans_list}

                    validated_rows.append({'student': student, 'responses': responses})

                if replace_existing:
                    TestSubmission.objects.filter(test=test, submission_type='OMR_EXCEL').delete()
                    keys_to_remove = [k for k, v in existing_sub_map.items() if v.submission_type == 'OMR_EXCEL']
                    for k in keys_to_remove:
                        del existing_sub_map[k]

                success_count = 0
                to_create = []
                for data in validated_rows:
                    student = data['student']
                    responses = data['responses']
                    sub = existing_sub_map.get(student._id)
                    if sub:
                        sub.responses = responses
                        sub.is_finalized = True
                        sub.submission_type = 'OMR_EXCEL'
                        sub.save()
                    else:
                        to_create.append(TestSubmission(
                            test=test, student=student, responses=responses, 
                            is_finalized=True, submission_type='OMR_EXCEL'
                        ))
                    success_count += 1
                
                if to_create:
                    TestSubmission.objects.bulk_create(to_create)

            else:
                score_col = next((c for c in ['score', 'total score', 'marks', 'total marks', 'total'] if c in df.columns), None)
                if not score_col:
                    return Response({'error': f'Could not identify score columns. Found: {original_columns}'}, status=400)

                for index, row in df.iterrows():
                    row_num = index + 2
                    if pd.isna(row[enroll_col]): continue

                    enroll_num = str(row[enroll_col]).strip().upper()
                    if enroll_num.endswith('.0'): enroll_num = enroll_num[:-2]
                    if enroll_num.isdigit(): enroll_num = f"PATH{enroll_num}"

                    try:
                        score = float(row[score_col])
                    except (ValueError, TypeError):
                        continue   # skip rows with invalid scores silently

                    if enroll_num in seen_enrollments:
                        continue
                    seen_enrollments.add(enroll_num)

                    student, err = _resolve_student(enroll_num, row_num)
                    if not student:
                        failed_rows.append({'original_enrollment': enroll_num, 'raw_data': {'score': score}, 'sheet_type': 'score', 'row_num': row_num})
                        continue

                    validated_rows.append({'student': student, 'score': score})

                if replace_existing:
                    TestSubmission.objects.filter(test=test, submission_type='OMR_EXCEL').delete()
                    keys_to_remove = [k for k, v in existing_sub_map.items() if v.submission_type == 'OMR_EXCEL']
                    for k in keys_to_remove:
                        del existing_sub_map[k]

                success_count = 0
                to_create = []
                for data in validated_rows:
                    student = data['student']
                    score = data['score']
                    sub = existing_sub_map.get(student._id)
                    if sub:
                        sub.score = score
                        sub.is_finalized = True
                        sub.submission_type = 'OMR_EXCEL'
                        sub.save()
                    else:
                        to_create.append(TestSubmission(
                            test=test, student=student, score=score, 
                            is_finalized=True, submission_type='OMR_EXCEL'
                        ))
                    success_count += 1

                if to_create:
                    TestSubmission.objects.bulk_create(to_create)

            # --- Persist failed rows (replace old ones for this test) ---
            from api.db_utils import get_db
            db = get_db()
            if db is not None:
                db['tests_omrfailedrecord'].delete_many({'test_id': test.id})
                if failed_rows:
                    import datetime
                    records_to_insert = [
                        {
                            'test_id': test.id,
                            'original_enrollment': r['original_enrollment'],
                            'raw_data': r['raw_data'],
                            'sheet_type': r['sheet_type'],
                            'row_num': r.get('row_num'),
                            'created_at': datetime.datetime.now()
                        } for r in failed_rows
                    ]
                    db['tests_omrfailedrecord'].insert_many(records_to_insert)

            # Invalidate admin list cache so failed_omr_count is fresh on next fetch
            from django.core.cache import cache
            cache.delete('admin_test_list')
            self.__class__._local_cache = {}

            failed_records_out = []
            if db is not None and failed_rows:
                failed_docs = list(db['tests_omrfailedrecord'].find({'test_id': test.id}))
                for doc in failed_docs:
                    failed_records_out.append({
                        'id': str(doc['_id']),
                        'original_enrollment': doc['original_enrollment'],
                        'raw_data': doc['raw_data'],
                        'sheet_type': doc['sheet_type'],
                        'row_num': doc.get('row_num')
                    })

            return Response({
                'message': f'Successfully uploaded records for {success_count} student(s).',
                'success_count': success_count,
                'failed_count': len(failed_rows),
                'failed_records': failed_records_out,
            })

        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=500)

    @action(detail=True, methods=['get'], url_path='failed_omr_records')
    def failed_omr_records(self, request, pk=None):
        """Return all unresolved OMR failed records for this test."""
        test = self.get_object()
        from api.db_utils import get_db
        db = get_db()
        data = []
        if db is not None:
            records = list(db['tests_omrfailedrecord'].find({'test_id': test.id}))
            for r in records:
                data.append({
                    'id': str(r['_id']),
                    'original_enrollment': r.get('original_enrollment'),
                    'raw_data': r.get('raw_data'),
                    'sheet_type': r.get('sheet_type'),
                    'row_num': r.get('row_num'),
                    'created_at': r.get('created_at').isoformat() if r.get('created_at') else None,
                })
        return Response(data)

    @action(detail=True, methods=['post'], url_path='retry_failed_omr')
    def retry_failed_omr(self, request, pk=None):
        """
        Retry resolving failed OMR records with corrected enrollment numbers.
        Body: [{"id": "<record_id>", "corrected_enrollment": "PATH3615009"}, ...]
        Matched records → create TestSubmission + delete OMRFailedRecord.
        Still-unmatched → update original_enrollment to the corrected value and keep in DB.
        Returns: { resolved_count, still_failed: [{id, original_enrollment, raw_data, sheet_type}] }
        """
        from .models import TestSubmission
        from api.models import CustomUser
        from api.erp_views import get_student_lookup_index
        from api.db_utils import get_db
        from bson import ObjectId

        test = self.get_object()
        corrections = request.data  # list of {id, corrected_enrollment}
        if not isinstance(corrections, list) or not corrections:
            return Response({'error': 'Expected a list of {id, corrected_enrollment} objects'}, status=400)

        db = get_db()
        if db is None:
            return Response({'error': 'Database connection failed'}, status=500)

        erp_index = get_student_lookup_index()
        
        resolved_count = 0
        still_failed = []

        for correction in corrections:
            rec_id = correction.get('id')
            new_enroll = correction.get('corrected_enrollment', '').strip().upper()
            if not rec_id or not new_enroll:
                continue
            
            try:
                record = db['tests_omrfailedrecord'].find_one({'_id': ObjectId(rec_id)})
            except Exception:
                record = None
                
            if not record:
                continue
                
            raw_data = record.get('raw_data')
            if isinstance(raw_data, str):
                import json
                try:
                    raw_data = json.loads(raw_data)
                except:
                    pass

            # 1. Lookup user in DB
            user = CustomUser.objects.filter(
                Q(admission_number__iexact=new_enroll) | Q(username__iexact=new_enroll)
            ).first()

            # 2. ERP Sync logic if not found
            if not user:
                erp_record = erp_index.get(f"adm_{new_enroll}")
                if erp_record:
                    try:
                        student_obj = erp_record.get('student') or {}
                        details_list = student_obj.get('studentsDetails', [])
                        email = ""
                        first_name = "Student"
                        last_name = ""
                        if details_list and isinstance(details_list, list) and len(details_list) > 0:
                            email = details_list[0].get('studentEmail', '')
                            name = details_list[0].get('studentName', '')
                            if name:
                                parts = name.strip().split(' ')
                                first_name = parts[0]
                                last_name = ' '.join(parts[1:]) if len(parts) > 1 else ''
                        user = CustomUser.objects.create(
                            username=email or new_enroll, email=email, admission_number=new_enroll,
                            user_type='student', first_name=first_name, last_name=last_name
                        )
                    except Exception as e:
                        print(f"Auto-sync failed for {new_enroll} during retry: {e}")

            if user:
                # 3. Create or update submission
                TestSubmission.objects.update_or_create(
                    test=test,
                    student=user,
                    defaults={
                        'submission_type': 'OMR_EXCEL',
                        'responses': raw_data if record.get('sheet_type') == 'raw' else None,
                        'score': raw_data.get('score', 0) if record.get('sheet_type') == 'score' else 0,
                        'is_finalized': True,
                    }
                )
                db['tests_omrfailedrecord'].delete_one({'_id': ObjectId(rec_id)})
                resolved_count += 1
            else:
                # 4. Still unmatched -> update the record with the new enrollment number
                db['tests_omrfailedrecord'].update_one(
                    {'_id': ObjectId(rec_id)},
                    {'$set': {'original_enrollment': new_enroll}}
                )
                still_failed.append({
                    'id': str(rec_id),
                    'original_enrollment': new_enroll,
                    'raw_data': record.get('raw_data'),
                    'sheet_type': record.get('sheet_type'),
                })

        return Response({
            'resolved_count': resolved_count,
            'still_failed': still_failed,
        })

    @action(detail=True, methods=['post'], url_path='delete_failed_omr')
    def delete_failed_omr(self, request, pk=None):
        """Delete specific failed OMR records from DB."""
        from api.db_utils import get_db
        from bson import ObjectId

        test = self.get_object()
        record_ids = request.data.get('ids', [])
        
        if not isinstance(record_ids, list) or not record_ids:
            return Response({'error': 'Expected a list of ids to delete'}, status=400)

        db = get_db()
        if db is None:
            return Response({'error': 'Database connection failed'}, status=500)

        try:
            object_ids = [ObjectId(r_id) for r_id in record_ids]
            result = db['tests_omrfailedrecord'].delete_many({
                '_id': {'$in': object_ids},
                'test_id': test.id
            })
            
            # Invalidate admin list cache so failed_omr_count is fresh on next fetch
            from django.core.cache import cache
            cache.delete('admin_test_list')
            
            return Response({'message': f'Successfully deleted {result.deleted_count} records.'})
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    @action(detail=True, methods=['get'], url_path='question_analysis')
    def question_analysis(self, request, pk=None):
        """
        Per-question analysis: for every question in this test, returns
        counts of correct / incorrect / partial / not_attempted across all submissions.
        """
        from api.db_utils import get_db
        from bson import ObjectId

        test = self.get_object()
        sections_data = []

        for section in test.sections.prefetch_related('questions').order_by('priority'):
            seen = set()
            order_list = section.question_order or []
            order_map = {str(oid): i for i, oid in enumerate(order_list)}

            unique_qs = []
            for q in section.questions.all():
                if str(q.pk) not in seen:
                    seen.add(str(q.pk))
                    unique_qs.append(q)
            unique_qs.sort(key=lambda q: order_map.get(str(q.pk), 999999))

            qs = []
            for q in unique_qs:
                q_id = str(q.pk)
                correct_options = [str(opt['id']) for opt in (q.question_options or []) if opt.get('isCorrect')]
                a_from = float(q.answer_from) if getattr(q, 'answer_from', None) is not None else None
                a_to   = float(q.answer_to)   if getattr(q, 'answer_to', None)   is not None else None
                qs.append({
                    'id': q_id,
                    'content': q.content or '',
                    'solution': q.solution or '',  # Include the solution/explanation
                    'type': q.question_type or 'SINGLE_CHOICE',
                    'correct_marks': float(section.correct_marks or 0),
                    'negative_marks': float(section.negative_marks or 0),
                    'correct_options': correct_options,
                    'options': q.question_options or [],   # full option list with content + isCorrect
                    'answer_from': a_from,
                    'answer_to': a_to,

                    'correct': 0,
                    'incorrect': 0,
                    'partial': 0,
                    'not_attempted': 0,
                    'total': 0,
                })
            sections_data.append({
                'name': section.name,
                'questions': qs,
            })

        # Aggregate from MongoDB
        db = get_db()
        if db is not None:
            try:
                try:
                    t_pk = ObjectId(test.pk)
                except Exception:
                    t_pk = test.pk

                sub_docs = list(db['tests_testsubmission'].find(
                    {'test_id': t_pk, 'is_finalized': True},
                    {'responses': 1}
                ))
            except Exception as e:
                print(f"[question_analysis] PyMongo error: {e}")
                sub_docs = []

            q_lookup = {}
            for sec in sections_data:
                for q in sec['questions']:
                    q_lookup[q['id']] = q

            total = len(sub_docs)
            for q in q_lookup.values():
                q['total'] = total

            for doc in sub_docs:
                raw_responses = doc.get('responses') or {}
                # MongoDB may store responses as a JSON string depending on how it was saved
                if isinstance(raw_responses, str):
                    import json
                    try:
                        raw_responses = json.loads(raw_responses)
                    except Exception:
                        raw_responses = {}
                responses = raw_responses if isinstance(raw_responses, dict) else {}

                for q_id, q_data in q_lookup.items():
                    response = responses.get(q_id)
                    # response may be a dict {'answer': ...}, a raw value, or None
                    if isinstance(response, dict):
                        answer = response.get('answer')
                    elif response is not None:
                        answer = response  # raw answer stored directly
                    else:
                        answer = None

                    if answer is None or answer == '' or answer == [] or (isinstance(answer, list) and len(answer) == 0):
                        q_data['not_attempted'] += 1
                        continue
                    q_type = q_data['type']
                    if q_type == 'SINGLE_CHOICE':
                        ans_str = str(answer).strip()
                        is_correct = False
                        matched_id = None
                        
                        # Pass 1: exact ID match
                        for oi, opt in enumerate(q_data['options']):
                            opt_id = str(opt.get('id', ''))
                            if ans_str == opt_id or ans_str.lower() == opt_id.lower():
                                matched_id = opt_id
                                break
                        
                        # Pass 2: fallback
                        if not matched_id:
                            keys = ['a', 'b', 'c', 'd', 'e', 'f']
                            for oi, opt in enumerate(q_data['options']):
                                opt_id = str(opt.get('id', ''))
                                opt_content = clean_html(opt.get('content') or opt.get('text', ''))
                                opt_label = keys[oi] if oi < len(keys) else None
                                if (ans_str.lower() == opt_content.lower() or 
                                    (opt_label and ans_str.lower() == opt_label) or 
                                    ans_str == str(oi + 1)):
                                    matched_id = opt_id
                                    break
                                    
                        if matched_id and matched_id in q_data['correct_options']:
                            is_correct = True

                        if is_correct:
                            q_data['correct'] += 1
                        else:
                            q_data['incorrect'] += 1
                    elif q_type == 'MULTI_CHOICE':
                        raw_selected = answer if isinstance(answer, list) else [answer]
                        selected = set()
                        keys = ['a', 'b', 'c', 'd', 'e', 'f']
                        
                        for item in raw_selected:
                            item_str = str(item).strip().lower()
                            matched_id = None
                            
                            # Pass 1: exact ID match
                            for oi, opt in enumerate(q_data['options']):
                                opt_id = str(opt.get('id', ''))
                                if item_str == opt_id.lower():
                                    matched_id = opt_id
                                    break
                                    
                            # Pass 2: fallback
                            if not matched_id:
                                for oi, opt in enumerate(q_data['options']):
                                    opt_id = str(opt.get('id', ''))
                                    opt_content = clean_html(opt.get('content') or opt.get('text', ''))
                                    opt_label = keys[oi] if oi < len(keys) else None
                                    if (item_str == opt_content.lower() or 
                                        (opt_label and item_str == opt_label) or 
                                        item_str == str(oi + 1)):
                                        matched_id = opt_id
                                        break
                                        
                            if matched_id:
                                selected.add(matched_id)
                                    
                        correct  = set(q_data['correct_options'])
                        if selected == correct:
                            q_data['correct'] += 1
                        elif selected & correct:
                            q_data['partial'] += 1
                        else:
                            q_data['incorrect'] += 1
                    elif q_type in ('NUMERICAL', 'INTEGER_TYPE'):
                        try:
                            val = float(answer)
                            lo, hi = q_data['answer_from'], q_data['answer_to']
                            if lo is not None and hi is not None and lo <= val <= hi:
                                q_data['correct'] += 1
                            else:
                                q_data['incorrect'] += 1
                        except (TypeError, ValueError):
                            q_data['incorrect'] += 1
                    else:
                        q_data['incorrect'] += 1

        return Response({
            'test_name': test.name,
            'test_code': test.code,
            'duration': test.duration,
            'sections': sections_data,
        })

    @action(detail=True, methods=['get'], url_path='question_student_analysis')
    def question_student_analysis(self, request, pk=None):
        """
        Returns a matrix: 
        Rows: Students (Finalized only)
        Cols: Questions (Flat list from all sections)
        Values: status (CA, IA, PA, NA)
        """
        from api.db_utils import get_db
        from bson import ObjectId
        from api.models import CustomUser

        test = self.get_object()

        # 1. Group questions by section
        flat_questions = []
        sections_info = []
        for section in test.sections.prefetch_related('questions').order_by('priority'):
            order_list = section.question_order or []
            order_map = {str(oid): i for i, oid in enumerate(order_list)}
            
            seen = set()
            section_qs = []
            for q in section.questions.all():
                if str(q.pk) not in seen:
                    seen.add(str(q.pk))
                    section_qs.append(q)
            section_qs.sort(key=lambda q: order_map.get(str(q.pk), 999999))

            count = 0
            for q in section_qs:
                count += 1
                flat_questions.append({
                    'id': str(q.pk),
                    'type': q.question_type,
                    'correct_options': [str(opt['id']) for opt in (q.question_options or []) if opt.get('isCorrect')],
                    'options': q.question_options or [],
                    'answer_from': float(q.answer_from) if q.answer_from is not None else None,
                    'answer_to': float(q.answer_to) if q.answer_to is not None else None,
                })
            
            if count > 0:
                sections_info.append({
                    'name': section.name,
                    'count': count
                })

        # 2. Get finalized submissions from MongoDB

        db = get_db()
        submissions = []
        if db is not None:
            try:
                try: t_pk = ObjectId(test.pk)
                except: t_pk = test.pk
                submissions = list(db['tests_testsubmission'].find(
                    {'test_id': t_pk, 'is_finalized': True},
                    {'student_id': 1, 'responses': 1}
                ))
            except: pass

        # 3. Enhance with student names/enrollments
        student_ids = [s['student_id'] for s in submissions]
        s_objs = CustomUser.objects.filter(_id__in=student_ids).values('_id', 'first_name', 'last_name', 'username', 'admission_number')
        s_lookup = {}
        for s in s_objs:
            full_name = f"{s['first_name']} {s['last_name']}".strip() or s['username']
            s_lookup[str(s['_id'])] = {
                'name': full_name,
                'enrollment_number': s['admission_number'] or s['username']
            }

        # 4. Build the matrix
        matrix_data = []
        for sub in submissions:
            sid_str = str(sub['student_id'])
            s_info = s_lookup.get(sid_str) or {'name': 'Unknown', 'enrollment_number': sid_str}
            
            # Parse responses
            raw_res = sub.get('responses') or {}
            if isinstance(raw_res, str):
                import json
                try: raw_res = json.loads(raw_res)
                except: raw_res = {}
            responses = raw_res if isinstance(raw_res, dict) else {}

            row = {
                'student_name': s_info['name'],
                'enrollment_number': s_info['enrollment_number'],
                'results': []
            }

            for q in flat_questions:
                q_id = q['id']
                res_obj = responses.get(q_id)
                ans = res_obj.get('answer') if isinstance(res_obj, dict) else res_obj
                
                status = 'NA' # Not Attempted
                if ans not in (None, '', [], {}):
                    q_type = q['type']
                    if q_type == 'SINGLE_CHOICE':
                        ans_str = str(ans)
                        is_correct = False
                        if ans_str in q['correct_options']:
                            is_correct = True
                        else:
                            mapping = {'A': '1', 'B': '2', 'C': '3', 'D': '4'}
                            if ans_str in mapping and mapping[ans_str] in q['correct_options']:
                                is_correct = True
                            
                            if not is_correct:
                                for opt in q['options']:
                                    opt_id = str(opt.get('id', ''))
                                    if opt_id in q['correct_options'] and (ans_str == opt_id or ans_str == opt.get('content')):
                                        is_correct = True
                                        break
                                        
                        status = 'CA' if is_correct else 'IA'
                    elif q_type == 'MULTI_CHOICE':
                        selected = set(map(str, ans if isinstance(ans, list) else [ans]))
                        correct = set(q['correct_options'])
                        if selected == correct: status = 'CA'
                        elif selected & correct: status = 'PA'
                        else: status = 'IA'
                    elif q_type in ('NUMERICAL', 'INTEGER_TYPE'):
                        try:
                            v = float(ans)
                            if q['answer_from'] <= v <= q['answer_to']: status = 'CA'
                            else: status = 'IA'
                        except: status = 'IA'
                    else:
                        status = 'IA'
                row['results'].append(status)
            
            matrix_data.append(row)

        return Response({
            'test_name': test.name,
            'questions_count': len(flat_questions),
            'sections_info': sections_info,
            'matrix': matrix_data
        })

    @action(detail=True, methods=['get'], url_path='student_results')
    def student_results(self, request, pk=None):
        from api.db_utils import get_db
        from bson import ObjectId
        from api.models import CustomUser

        test = self.get_object()

        from sections.models import Section
        # Use fresh query with prefetch_related to load all questions in a single indexed query
        sections = list(Section.objects.filter(test=test).select_related('partial_mark_rule').prefetch_related('questions').order_by('priority'))
        # Build flat q_map and accumulation of max marks
        q_map = {} 
        sections_max = {}
        section_questions_map = {}
        for sec in sections:
            if sec.name not in sections_max:
                sections_max[sec.name] = 0
            
            c_marks = float(sec.correct_marks or 0)
            seen_q_local = set()
            
            sec_questions = list(sec.questions.all())
            section_questions_map[sec.pk] = sec_questions
            
            for q in sec_questions:
                qid = str(q.pk)
                if qid in seen_q_local: continue
                seen_q_local.add(qid)
                
                sections_max[sec.name] += c_marks
                
                if qid not in q_map:
                    q_map[qid] = {
                        'id': qid,
                        'section': sec.name,
                        'correct': c_marks,
                        'negative': float(sec.negative_marks or 0),
                        'type': q.question_type or 'SINGLE_CHOICE',
                        'correct_options': [str(opt['id']) for opt in (q.question_options or []) if opt.get('isCorrect')],
                        'correct_contents': [clean_html(opt.get('content') or opt.get('text', '')) for opt in (q.question_options or []) if opt.get('isCorrect')],
                        'answer_from': float(q.answer_from) if getattr(q, 'answer_from', None) is not None else None,
                        'answer_to': float(q.answer_to) if getattr(q, 'answer_to', None) is not None else None,
                        'options': q.question_options or [],
                    }

        db = get_db()
        submissions = []
        if db is not None:
            try:
                try: t_pk = ObjectId(test.pk)
                except: t_pk = test.pk
                submissions = list(db['tests_testsubmission'].find(
                    {'test_id': t_pk, 'is_finalized': True}
                ))
            except: pass

        if not submissions:
            from .models import TestSubmission
            submissions_qs = TestSubmission.objects.filter(test=test, is_finalized=True)
            for s in submissions_qs:
                submissions.append({
                    'student_id': s.student_id,
                    'responses': s.responses,
                    'time_spent': s.time_spent,
                    'score': s.score
                })

        student_ids = [s['student_id'] for s in submissions]
        s_objs = CustomUser.objects.filter(pk__in=student_ids).values('pk', 'first_name', 'last_name', 'username', 'admission_number', 'centre_name', 'assigned_batch')
        s_lookup = {}
        for s in s_objs:
            s_lookup[str(s['pk'])] = s

        from api.erp_views import get_student_lookup_index
        erp_index = get_student_lookup_index() or {}

        result_data = []
        for sub in submissions:
            sid = str(sub['student_id'])
            s_info = s_lookup.get(sid) or {}
            
            raw_res = sub.get('responses') or {}
            if isinstance(raw_res, str):
                import json
                try: raw_res = json.loads(raw_res)
                except: raw_res = {}
            responses = raw_res if isinstance(raw_res, dict) else {}

            # GRACE MARKS (gated): only applied for questions in the stored grace list, which is
            # populated when admin clicks 'Generate Result'. Never applied on live is_wrong flag.
            grace_qs = set(str(qid) for qid in (sub.get('grace_applied_questions') or []))

            section_scores = {sec_name: 0.0 for sec_name in sections_max.keys()}
            total_correct = 0
            total_attempted = 0
            total_positive = 0
            total_negative = 0
            
            keys = ['a', 'b', 'c', 'd', 'e', 'f']
            
            # Loop over sections and their specific questions to match detailed report logic
            for sec in sections:
                sec_name = sec.name
                sec_earned = 0
                sec_neg = 0
                
                # Fetch questions for this specific section allotment from in-memory cache
                seen_in_sec = set()
                sec_questions = section_questions_map.get(sec.pk, [])
                for q in sec_questions:
                    qid = str(q.pk)
                    if qid in seen_in_sec: continue
                    seen_in_sec.add(qid)
                    
                    res_obj = responses.get(qid)
                    if res_obj is None:
                        try: res_obj = responses.get(int(qid))
                        except: pass
                    
                    ans = res_obj.get('answer') if isinstance(res_obj, dict) else res_obj
                    if ans in (None, '', [], {}):
                        continue
                    
                    total_attempted += 1
                    earned = 0
                    neg = 0
                    q_type = q.question_type or 'SINGLE_CHOICE'
                    c_marks = float(sec.correct_marks or 0)
                    n_marks = float(sec.negative_marks or 0)

                    # GRACE MARKS: Question in the stored grace list → full marks, no negative
                    if qid in grace_qs:
                        earned = c_marks
                        sec_earned += earned
                        total_correct += 1
                        continue

                    if q_type == 'SINGLE_CHOICE':
                        ans_str = str(ans).strip().lower()
                        is_correct = False
                        
                        opts = q.question_options or []
                        for oi, opt in enumerate(opts):
                            opt_id = str(opt.get('id', ''))
                            opt_label = keys[oi] if oi < len(keys) else None
                            if ans_str == opt_id or (opt_label and ans_str == opt_label):
                                if opt.get('isCorrect'): is_correct = True
                                break
                        if not is_correct:
                            pass
                        
                        if is_correct:
                            earned = c_marks
                            total_correct += 1
                        else:
                            neg = n_marks
                    
                    elif q_type == 'MULTI_CHOICE':
                        raw_selected = ans if isinstance(ans, list) else [ans]
                        normalized_selected = set()
                        opts = q.question_options or []
                        for item in raw_selected:
                            item_str = str(item).strip().lower()
                            for oi, opt in enumerate(opts):
                                opt_id = str(opt.get('id', ''))
                                opt_content = clean_html(opt.get('content') or opt.get('text', ''))
                                opt_label = keys[oi] if oi < len(keys) else None
                                if item_str == opt_id or item_str == opt_content or (opt_label and item_str == opt_label):
                                    normalized_selected.add(opt_id)
                                    break
                        correct_set = set([str(opt['id']) for opt in opts if opt.get('isCorrect')])
                        rule = sec.partial_mark_rule
                        if rule and rule.logic_type == 'JEE_ADVANCED':
                            if not normalized_selected.issubset(correct_set):
                                neg = rule.base_negative_marks
                            elif normalized_selected == correct_set:
                                earned = rule.base_correct_marks
                                total_correct += 1
                            else:
                                num_correct_selected = len(normalized_selected)
                                if num_correct_selected >= 3: earned = 3.0
                                elif num_correct_selected == 2: earned = 2.0
                                elif num_correct_selected == 1: earned = 1.0
                                else: earned = float(num_correct_selected)
                        elif rule and rule.logic_type in ['WBJEE', 'CUSTOM_FRACTIONAL']:
                            if not normalized_selected.issubset(correct_set):
                                if rule.logic_type == 'CUSTOM_FRACTIONAL':
                                    neg = rule.base_negative_marks
                                else:
                                    neg = 0.0
                            elif normalized_selected == correct_set:
                                earned = rule.base_correct_marks
                                total_correct += 1
                            else:
                                fraction = len(normalized_selected) / len(correct_set) if correct_set else 0
                                earned = round(rule.base_correct_marks * fraction, 2)
                        elif rule and rule.logic_type == 'STANDARD':
                            if normalized_selected == correct_set:
                                earned = rule.base_correct_marks
                                total_correct += 1
                            else:
                                neg = rule.base_negative_marks
                        else:
                            if normalized_selected == correct_set:
                                earned = c_marks
                                total_correct += 1
                            elif normalized_selected & correct_set:
                                fraction = len(normalized_selected & correct_set) / len(correct_set) if correct_set else 0
                                earned = round(c_marks * fraction, 2)
                            else:
                                neg = n_marks
                    
                    elif q_type in ('NUMERICAL', 'INTEGER_TYPE'):
                        try:
                            val = float(ans)
                            ans_from = float(q.answer_from) if getattr(q, 'answer_from', None) is not None else None
                            ans_to = float(q.answer_to) if getattr(q, 'answer_to', None) is not None else None
                            if ans_from is not None and ans_to is not None:
                                if ans_from <= val <= ans_to:
                                    earned = c_marks
                                    total_correct += 1
                                else:
                                    neg = n_marks
                        except:
                            neg = n_marks
                    
                    sec_earned += earned
                    sec_neg += neg
                
                section_scores[sec_name] += (sec_earned - sec_neg)
                total_positive += sec_earned
                total_negative += sec_neg

            total_recalculated = round(total_positive - total_negative, 2)
            accuracy = (total_correct / total_attempted * 100) if total_attempted > 0 else 0
            
            ts = int(sub.get('time_spent', 0))
            h = ts // 3600
            m = (ts % 3600) // 60
            s_sec = ts % 60
            time_str = f"{h}:{m:02d}:{s_sec:02d}" if h > 0 else f"0:{m:02d}:{s_sec:02d}"

            # Get batch and centre directly from DB, or fallback to the in-memory ERP index
            batch_str = s_info.get('assigned_batch')
            centre_str = s_info.get('centre_name')

            if not batch_str or not centre_str:
                adm = s_info.get('admission_number') or s_info.get('username')
                if adm:
                    match = erp_index.get(f"adm_{str(adm).strip().upper()}")
                    if match:
                        if not batch_str:
                            batches = (match.get('student') or {}).get('batches', [])
                            if batches and isinstance(batches, list) and len(batches) > 0:
                                batch_str = batches[0].get('batchName')
                        if not centre_str:
                            centre_str = match.get('centre')
            
            batch_str = batch_str or "N/A"
            centre_str = centre_str or "N/A"

            result_data.append({
                'name': (f"{s_info.get('first_name','')} {s_info.get('last_name','')}".strip() or s_info.get('username','Unknown')).upper(),
                'enrollment': s_info.get('admission_number') or s_info.get('username') or 'N/A',
                'centre': centre_str.upper() if centre_str != 'N/A' else 'N/A',
                'batch': batch_str.upper(),
                'marks': round(total_recalculated, 2),
                'accuracy': f"{round(accuracy, 2)}%",
                'totalTime': time_str,
                'time_spent_raw': ts,
                'submitted_at': sub.get('submitted_at') or sub.get('_id'),
                'section_scores': {k: f"{round(v, 2)}/{int(sections_max[k]) if float(sections_max[k] or 0).is_integer() else sections_max[k]}" for k, v in section_scores.items()},
                'total_recalculated': round(total_recalculated, 2) # Adding this for debugging if needed
            })

        # Sort by total_recalculated (marks) desc, time_spent (efficiency) asc
        result_data.sort(key=lambda x: (-float(x['marks']), int(x.get('time_spent_raw', 0)), str(x.get('submitted_at', ''))))
        for i, row in enumerate(result_data):
            row['rank'] = i + 1

        return Response({
            'sections': list(sections_max.keys()),
            'students': result_data
        })



    @action(detail=True, methods=['post'], url_path='generate_result')
    def generate_result(self, request, pk=None):
        """
        Recalculates and persists scores for all finalized submissions for this test.
        Applies grace marks for questions with is_wrong=True at the time of calling.
        Stores grace_applied_questions and updated score in each submission document.
        This is the gated action - marks only change when admin explicitly calls this.
        """
        from api.db_utils import get_db
        from bson import ObjectId
        from django.utils import timezone
        import json

        test = self.get_object()
        db = get_db()
        if db is None:
            return Response({'error': 'Database unavailable.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        # Load all sections and questions, capturing is_wrong at the moment of generation
        from sections.models import Section
        sections = list(Section.objects.filter(test=test).select_related('partial_mark_rule').prefetch_related('questions').order_by('priority'))

        q_map = {}
        section_questions_map = {}
        for sec in sections:
            sec_questions = list(sec.questions.all())
            section_questions_map[sec.pk] = sec_questions
            for q in sec_questions:
                qid = str(q.pk)
                if qid not in q_map:
                    q_map[qid] = {
                        'correct': float(sec.correct_marks or 0),
                        'negative': float(sec.negative_marks or 0),
                        'is_wrong': getattr(q, 'is_wrong', False),
                        'type': q.question_type or 'SINGLE_CHOICE',
                        'correct_options': [str(opt['id']) for opt in (q.question_options or []) if opt.get('isCorrect')],
                        'answer_from': float(q.answer_from) if getattr(q, 'answer_from', None) is not None else None,
                        'answer_to': float(q.answer_to) if getattr(q, 'answer_to', None) is not None else None,
                        'options': q.question_options or [],
                        'partial_mark_rule': sec.partial_mark_rule,
                    }

        # Collect which question IDs have grace marks at time of generation
        wrong_question_ids = [qid for qid, qi in q_map.items() if qi.get('is_wrong')]

        # Fetch all finalized submissions
        try:
            try: t_pk = ObjectId(test.pk)
            except: t_pk = test.pk
            submissions = list(db['tests_testsubmission'].find(
                {'test_id': t_pk, 'is_finalized': True}
            ))
        except Exception as e:
            return Response({'error': f'Failed to fetch submissions: {e}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if not submissions:
            Test.objects.filter(pk=test.pk).update(is_completed=True)
            return Response({
                'message': 'No submissions found. Test marked as completed.',
                'processed': 0,
                'grace_questions': len(wrong_question_ids)
            })

        keys = ['a', 'b', 'c', 'd', 'e', 'f']
        processed = 0
        errors = 0

        for sub in submissions:
            try:
                raw_res = sub.get('responses') or {}
                if isinstance(raw_res, str):
                    try: raw_res = json.loads(raw_res)
                    except: raw_res = {}
                responses = raw_res if isinstance(raw_res, dict) else {}

                total_score = 0.0

                for sec in sections:
                    sec_earned = 0.0
                    sec_neg = 0.0
                    seen = set()
                    sec_questions = section_questions_map.get(sec.pk, [])

                    for q in sec_questions:
                        qid = str(q.pk)
                        if qid in seen: continue
                        seen.add(qid)

                        qi = q_map.get(qid, {})
                        c_marks = qi.get('correct', 0)
                        n_marks = qi.get('negative', 0)

                        res_obj = responses.get(qid)
                        if res_obj is None:
                            try: res_obj = responses.get(int(qid))
                            except: pass
                        ans = res_obj.get('answer') if isinstance(res_obj, dict) else res_obj

                        if ans in (None, '', [], {}): continue

                        # GRACE MARKS: questions marked wrong at generation time
                        if qi.get('is_wrong'):
                            sec_earned += c_marks
                            continue

                        # Normal scoring
                        earned = 0.0
                        neg = 0.0
                        q_type = qi.get('type', 'SINGLE_CHOICE')

                        if q_type == 'SINGLE_CHOICE':
                            ans_str = str(ans).strip().lower()
                            is_correct = False
                            for oi, opt in enumerate(qi.get('options', [])):
                                opt_id = str(opt.get('id', ''))
                                opt_label = keys[oi] if oi < len(keys) else None
                                if ans_str == opt_id or (opt_label and ans_str == opt_label):
                                    if opt.get('isCorrect'): is_correct = True
                                    break
                            if not is_correct:
                                pass
                            if is_correct: earned = c_marks
                            else: neg = n_marks
                        elif q_type == 'MULTI_CHOICE':
                            raw_selected = ans if isinstance(ans, list) else [ans]
                            normalized_selected = set()
                            for item in raw_selected:
                                item_str = str(item).strip().lower()
                                for oi, opt in enumerate(qi.get('options', [])):
                                    opt_id = str(opt.get('id', ''))
                                    opt_content = clean_html(opt.get('content') or opt.get('text', ''))
                                    opt_label = keys[oi] if oi < len(keys) else None
                                    if item_str == opt_id or item_str == opt_content or (opt_label and item_str == opt_label):
                                        normalized_selected.add(opt_id)
                                        break
                            correct_set = set(qi.get('correct_options', []))
                            rule = qi.get('partial_mark_rule')
                            if rule and rule.logic_type == 'JEE_ADVANCED':
                                if not normalized_selected.issubset(correct_set):
                                    neg = rule.base_negative_marks
                                elif normalized_selected == correct_set:
                                    earned = rule.base_correct_marks
                                else:
                                    num_correct_selected = len(normalized_selected)
                                    if num_correct_selected >= 3: earned = 3.0
                                    elif num_correct_selected == 2: earned = 2.0
                                    elif num_correct_selected == 1: earned = 1.0
                                    else: earned = float(num_correct_selected)
                            elif rule and rule.logic_type in ['WBJEE', 'CUSTOM_FRACTIONAL']:
                                if not normalized_selected.issubset(correct_set):
                                    if rule.logic_type == 'CUSTOM_FRACTIONAL':
                                        neg = rule.base_negative_marks
                                    else:
                                        neg = 0.0
                                elif normalized_selected == correct_set:
                                    earned = rule.base_correct_marks
                                else:
                                    fraction = len(normalized_selected) / len(correct_set) if correct_set else 0
                                    earned = round(rule.base_correct_marks * fraction, 2)
                            elif rule and rule.logic_type == 'STANDARD':
                                if normalized_selected == correct_set:
                                    earned = rule.base_correct_marks
                                else:
                                    neg = rule.base_negative_marks
                            else:
                                if normalized_selected == correct_set: earned = c_marks
                                elif normalized_selected & correct_set:
                                    fraction = len(normalized_selected & correct_set) / len(correct_set) if correct_set else 0
                                    earned = round(c_marks * fraction, 2)
                                else: neg = n_marks
                        elif q_type in ('NUMERICAL', 'INTEGER_TYPE'):
                            try:
                                val = float(ans)
                                if qi.get('answer_from') is not None and qi.get('answer_to') is not None:
                                    if qi['answer_from'] <= val <= qi['answer_to']: earned = c_marks
                                    else: neg = n_marks
                            except: neg = n_marks

                        sec_earned += earned
                        sec_neg += neg

                    total_score += (sec_earned - sec_neg)

                # Persist updated score + grace info to MongoDB
                db['tests_testsubmission'].update_one(
                    {'_id': sub['_id']},
                    {'$set': {
                        'score': round(total_score, 2),
                        'grace_applied_questions': wrong_question_ids,
                        'result_generated_at': timezone.now()
                    }}
                )
                processed += 1
            except Exception as e:
                print(f"[generate_result] Error processing sub {sub.get('_id')}: {e}")
                errors += 1

        # Mark test as completed so frontend shows 'Regenerate' button next time
        Test.objects.filter(pk=test.pk).update(is_completed=True)

        grace_count = len(wrong_question_ids)
        grace_msg = f" Grace marks applied to {grace_count} question(s)." if grace_count else " No grace marks applied."
        return Response({
            'message': f'Results generated successfully for {processed} student(s).{grace_msg}',
            'processed': processed,
            'grace_questions': grace_count,
            'errors': errors
        })


    @action(detail=True, methods=['post'], url_path='save_question_reflection')
    def save_question_reflection(self, request, pk=None):
        """
        Saves student reflection for an incorrectly answered question.
        Payload: {"question_id": "...", "reflection": "..."}
        """
        from api.db_utils import get_db
        from bson import ObjectId
        import json

        test = self.get_object()
        user = request.user
        
        if not user or not user.is_authenticated:
            return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
            
        question_id = request.data.get('question_id')
        if isinstance(question_id, int):
            question_id = str(question_id)
            
        reflection = request.data.get('reflection', '')
        manual_subtopic = request.data.get('manual_subtopic')
        
        if not question_id:
            return Response({'error': 'question_id is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        db = get_db()
        if db is None:
            return Response({'error': 'Database unavailable'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
        try: t_pk = ObjectId(test.pk)
        except: t_pk = test.pk
        
        sub_doc = db['tests_testsubmission'].find_one(
            {'test_id': t_pk, 'student_id': user.pk, 'is_finalized': True}
        )
        
        if not sub_doc:
            return Response({'error': 'Test submission not found'}, status=status.HTTP_404_NOT_FOUND)
            
        raw_res = sub_doc.get('responses', {})
        if isinstance(raw_res, str):
            try: raw_res = json.loads(raw_res)
            except: raw_res = {}
            
        res_obj = raw_res.get(question_id)
        if res_obj is None:
            try: res_obj = raw_res.get(int(question_id))
            except: pass
            
        if res_obj is None:
            # If the user didn't even attempt the question, we might still want to allow reflection
            # So initialize it as an empty dict
            res_obj = {'answer': None, 'time': 0}
            
        if isinstance(res_obj, dict):
            res_obj['reflection'] = reflection
            if manual_subtopic is not None:
                res_obj['manual_subtopic'] = manual_subtopic
        else:
            # Convert raw answer to dict
            res_obj = {'answer': res_obj, 'reflection': reflection}
            if manual_subtopic is not None:
                res_obj['manual_subtopic'] = manual_subtopic
            
        raw_res[question_id] = res_obj
        
        db['tests_testsubmission'].update_one(
            {'_id': sub_doc['_id']},
            {'$set': {'responses': raw_res, 'has_reflections': True}}
        )
        
        # In case the SQL model also keeps a copy
        from .models import TestSubmission
        try:
            sql_sub = TestSubmission.objects.get(test=test, student=user)
            sql_res = sql_sub.responses
            if isinstance(sql_res, str):
                try: sql_res = json.loads(sql_res)
                except: sql_res = {}
            if question_id in sql_res:
                if isinstance(sql_res[question_id], dict):
                    sql_res[question_id]['reflection'] = reflection
                else:
                    sql_res[question_id] = {'answer': sql_res[question_id], 'reflection': reflection}
            else:
                sql_res[question_id] = {'answer': None, 'reflection': reflection}
            
            if manual_subtopic is not None:
                if isinstance(sql_res[question_id], dict):
                    sql_res[question_id]['manual_subtopic'] = manual_subtopic
                    
            # Ensure it's a plain dict to avoid OrderedDict JSON loads issues in SQLite
            import json
            sql_sub.responses = json.loads(json.dumps(sql_res))
            sql_sub.save(update_fields=['responses'])
        except Exception as e:
            import traceback
            print("Error updating SQL model responses:", traceback.format_exc())
            
        return Response({'success': True, 'message': 'Reflection saved successfully'})

    @action(detail=True, methods=['get'], url_path='student_reflections')
    def student_reflections(self, request, pk=None):
        """
        Returns all student reflections for a specific test.
        """
        from api.db_utils import get_db
        from bson import ObjectId
        import json
        
        test = self.get_object()
        db = get_db()
        if db is None:
            return Response({'error': 'Database unavailable'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
        try: t_pk = ObjectId(test.pk)
        except: t_pk = test.pk
        
        submissions = db['tests_testsubmission'].find({'test_id': t_pk, 'is_finalized': True})
        
        # Load questions using Django ORM to ensure correct text
        q_dict = {}
        q_number = 1
        for sec in test.sections.all().prefetch_related('questions', 'questions__chapter', 'questions__topic'):
            order_list = sec.question_order or []
            sec_q_map = {str(q.pk): q for q in sec.questions.all()}
            
            ordered_q_ids = [str(qid) for qid in order_list if str(qid) in sec_q_map]
            for qid in sec_q_map.keys():
                if qid not in ordered_q_ids:
                    ordered_q_ids.append(qid)
            
            for qid in ordered_q_ids:
                q = sec_q_map[qid]
                q_dict[qid] = {
                    'question_number': q_number,
                    'content': getattr(q, 'content', 'Unknown Question'),
                    'type': getattr(q, 'question_type', sec.question_type),
                    'chapter': q.chapter.name if hasattr(q, 'chapter') and q.chapter else 'N/A',
                    'topic': q.topic.name if hasattr(q, 'topic') and q.topic else 'N/A',
                    'subtopic': 'N/A',
                    'negative_marks': getattr(sec, 'negative_marks', 0),
                    'solution': getattr(q, 'solution', ''),
                    'options': getattr(q, 'question_options', []), 
                    'answer_from': getattr(q, 'answer_from', None),
                    'answer_to': getattr(q, 'answer_to', None),
                    'sectionName': sec.name
                }
                q_number += 1
                    
        # Group by student
        student_ids = []
        subs_list = []
        for sub in submissions:
            subs_list.append(sub)
            if 'student_id' in sub:
                student_ids.append(sub['student_id'])
                
        from api.models import CustomUser
        students = CustomUser.objects.filter(pk__in=student_ids).values('_id', 'first_name', 'last_name', 'admission_number', 'username', 'centre_name')
        student_dict = {str(s['_id']): s for s in students}
        
        reflections = []
        for sub in subs_list:
            student_id = sub.get('student_id')
            if not student_id:
                continue
            student_id_str = str(student_id)
                
            raw_res = sub.get('responses', {})
            if isinstance(raw_res, str):
                try: raw_res = json.loads(raw_res)
                except: raw_res = {}
                
            student = student_dict.get(student_id_str, {})
            name = f"{student.get('first_name', '')} {student.get('last_name', '')}".strip() or student.get('username') or "Unknown"
            enrollment = student.get('admission_number') or student.get('username') or "N/A"
                
            for q_id, res_obj in raw_res.items():
                if isinstance(res_obj, dict) and res_obj.get('reflection'):
                    q_data = q_dict.get(str(q_id), {})
                    reflections.append({
                        'student_id': student_id_str,
                        'student_name': name,
                        'enrollment_number': enrollment,
                        'centre_name': student.get('centre_name') or "Unknown Center",
                        'question_id': str(q_id),
                        'question_number': q_data.get('question_number', 0),
                        'question_content': q_data.get('content', 'Unknown Question'),
                        'type': q_data.get('type', ''),
                        'chapter': q_data.get('chapter', ''),
                        'topic': q_data.get('topic', ''),
                        'subtopic': q_data.get('subtopic', ''),
                        'negative_marks': q_data.get('negative_marks', 0),
                        'solution': q_data.get('solution', ''),
                        'options': q_data.get('options', []),
                        'answer_from': q_data.get('answer_from'),
                        'answer_to': q_data.get('answer_to'),
                        'sectionName': q_data.get('sectionName', ''),
                        'user_answer': res_obj.get('answer', ''),
                        'reflection': res_obj['reflection']
                    })
                    
        return Response({'reflections': reflections})

    @action(detail=False, methods=['get'], url_path='with_reflections')
    def with_reflections(self, request):
        """
        Returns a list of tests with their student reflection counts.
        """
        from api.db_utils import get_db
        db = get_db()
        if db is None:
            return Response({'error': 'Database unavailable'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
        pipeline = [
            {'$match': {'has_reflections': True}},
            {'$group': {'_id': '$test_id', 'student_count': {'$sum': 1}}}
        ]
        results = db['tests_testsubmission'].aggregate(pipeline)
        
        counts_data = {}
        for r in results:
            counts_data[str(r['_id'])] = r['student_count']
            
        return Response({'tests': counts_data})


    @action(detail=True, methods=['get'], url_path='student_performance')
    def student_performance(self, request, pk=None):
        """
        Returns detailed performance breakdown for a single student.
        Query params: ?enrollment=<admission_number_or_username>
        """
        from api.db_utils import get_db
        from bson import ObjectId
        from api.models import CustomUser
        import json

        enrollment = request.query_params.get('enrollment', '').strip()
        if not enrollment:
            if request.user and request.user.is_authenticated:
                enrollment = request.user.admission_number or request.user.username
            else:
                return Response({'error': 'enrollment param is required'}, status=status.HTTP_400_BAD_REQUEST)

        test = self.get_object()

        # 1. Resolve student
        student_obj = CustomUser.objects.filter(admission_number__iexact=enrollment).first() \
                   or CustomUser.objects.filter(username__iexact=enrollment).first()

        # 2. Load all sections + questions once
        sections = list(test.sections.prefetch_related('questions').order_by('priority'))
        # Build flat q_map: q_id -> metadata
        q_map = {}
        sections_meta = []
        for sec in sections:
            order_list = sec.question_order or []
            order_map = {str(oid): i for i, oid in enumerate(order_list)}
            seen = set()
            qs = []
            for q in sec.questions.all():
                qid = str(q.pk)
                if qid not in seen:
                    seen.add(qid)
                    qs.append(q)
            qs.sort(key=lambda q: order_map.get(str(q.pk), 999999))
            total_q_marks = len(qs) * float(sec.correct_marks or 0)
            sections_meta.append({
                'name': sec.name,
                'questions': qs,
                'correct_marks': float(sec.correct_marks or 0),
                'negative_marks': float(sec.negative_marks or 0),
                'total_max_marks': total_q_marks,
                'question_count': len(qs),
            })
            for q in qs:
                qid = str(q.pk)
                q_map[qid] = {
                    'section': sec.name,
                    'correct_marks': float(sec.correct_marks or 0),
                    'negative_marks': float(sec.negative_marks or 0),
                    'partial_mark_rule': sec.partial_mark_rule,
                    'is_wrong': False,  # Will be patched from grace_applied_questions after sub_doc is loaded
                    'type': q.question_type or 'SINGLE_CHOICE',
                    'correct_options': [str(opt['id']) for opt in (q.question_options or []) if opt.get('isCorrect')],
                    'correct_contents': [clean_html(opt.get('content') or opt.get('text', '')) for opt in (q.question_options or []) if opt.get('isCorrect')],
                    'answer_from': float(q.answer_from) if getattr(q, 'answer_from', None) is not None else None,
                    'answer_to': float(q.answer_to) if getattr(q, 'answer_to', None) is not None else None,
                    'options': q.question_options or [],
                    'content': q.content or '',
                    'solution': q.solution or '',
                }

        total_questions = sum(s['question_count'] for s in sections_meta)
        db = get_db()

        # 3. Fetch the student's submission
        sub_doc = None
        if db is not None and student_obj:
            try:
                try: t_pk = ObjectId(test.pk)
                except: t_pk = test.pk
                sub_doc = db['tests_testsubmission'].find_one(
                    {'test_id': t_pk, 'student_id': student_obj.pk, 'is_finalized': True}
                )
            except: pass

        if not sub_doc:
            # For missed exams, provide a mock finalized document so students can see solutions/topper data
            sub_doc = {
                'responses': {},
                'time_spent': 0,
                'submitted_at': None,
                'is_finalized': True,
                'is_missed': True
            }

        raw_res = sub_doc.get('responses') or {}
        if isinstance(raw_res, str):
            try: raw_res = json.loads(raw_res)
            except: raw_res = {}
        responses = raw_res if isinstance(raw_res, dict) else {}

        # GRACE MARKS (gated): Patch q_map from stored grace_applied_questions.
        # This list is ONLY set when admin runs 'Generate Result'. Before that, no grace is shown.
        grace_applied_questions = set(str(qid) for qid in (sub_doc.get('grace_applied_questions') or []))
        for qid_g in grace_applied_questions:
            if qid_g in q_map:
                q_map[qid_g]['is_wrong'] = True

        # 4. Evaluate per question + per section
        section_stats = {}
        for sec in sections_meta:
            section_stats[sec['name']] = {
                'correct': 0, 'incorrect': 0, 'partial': 0, 'unattempted': 0,
                'positive_marks': 0.0, 'negative_marks': 0.0, 'net_marks': 0.0,
                'total_max': sec['total_max_marks'],
                'total_questions': sec['question_count'],
                'time_spent': 0,
            }

        total_correct = 0
        total_incorrect = 0
        total_partial = 0
        total_unattempted = 0
        total_positive = 0.0
        total_negative = 0.0

        question_results = []  # per-section list for Solution tab
        section_question_map = {sec['name']: [] for sec in sections_meta}

        for sec in sections_meta:
            for q in sec['questions']:
                qid = str(q.pk)
                qi = q_map[qid]
                res_obj = responses.get(qid)
                if res_obj is None:
                    try: res_obj = responses.get(int(qid))
                    except: pass
                ans = res_obj.get('answer') if isinstance(res_obj, dict) else res_obj

                q_result = 'NA'
                earned = 0.0
                neg = 0.0
                user_answer = ans  # keep raw for display
                q_time = res_obj.get('time', 0) if isinstance(res_obj, dict) else 0
                section_stats[sec['name']]['time_spent'] += q_time

                if ans in (None, '', [], {}):
                    q_result = 'NA'
                    section_stats[sec['name']]['unattempted'] += 1
                    total_unattempted += 1
                else:
                    qtype = qi['type']
                    # GRACE MARKS: Question flagged wrong → full marks regardless of answer, no negative
                    if qi.get('is_wrong'):
                        q_result = 'GR'
                        earned = qi['correct_marks']
                        neg = 0
                        total_correct += 1
                        section_stats[sec['name']]['correct'] += 1
                    elif qtype == 'SINGLE_CHOICE':
                        ans_str = str(ans).strip()
                        
                        is_correct = False
                        matched_id = None
                        
                        # Primary: match by option ID (most reliable)
                        for oi, opt in enumerate(qi.get('options', [])):
                            opt_id = str(opt.get('id', ''))
                            if ans_str == opt_id or ans_str.lower() == opt_id.lower():
                                matched_id = opt_id
                                if opt.get('isCorrect'):
                                    is_correct = True
                                break

                        # Fallback
                        if not matched_id:
                            keys = ['a', 'b', 'c', 'd', 'e', 'f']
                            ans_lower = ans_str.lower()
                            for oi, opt in enumerate(qi.get('options', [])):
                                opt_id = str(opt.get('id', ''))
                                opt_content = clean_html(opt.get('content') or opt.get('text', ''))
                                opt_label = keys[oi] if oi < len(keys) else None
                                if (ans_lower == opt_content.lower() or 
                                    (opt_label and ans_lower == opt_label) or 
                                    ans_str == str(oi + 1)):
                                    matched_id = opt_id
                                    if opt.get('isCorrect'):
                                        is_correct = True
                                    break

                        if is_correct:
                            q_result = 'CA'
                            earned = qi['correct_marks']
                            total_correct += 1
                            section_stats[sec['name']]['correct'] += 1
                        else:
                            q_result = 'IA'
                            neg = qi['negative_marks']
                            total_incorrect += 1
                            section_stats[sec['name']]['incorrect'] += 1
                    elif qtype == 'MULTI_CHOICE':
                        # Normalize selected to IDs
                        raw_selected = ans if isinstance(ans, list) else [ans]
                        normalized_selected = set()
                        keys = ['a', 'b', 'c', 'd', 'e', 'f']
                        
                        for item in raw_selected:
                            item_str = str(item).strip().lower()
                            matched_id = None
                            
                            # Pass 1: exact ID
                            for oi, opt in enumerate(qi.get('options', [])):
                                opt_id = str(opt.get('id', ''))
                                if item_str == opt_id.lower():
                                    matched_id = opt_id
                                    break
                                    
                            # Pass 2: fallback
                            if not matched_id:
                                for oi, opt in enumerate(qi.get('options', [])):
                                    opt_id = str(opt.get('id', ''))
                                    opt_content = clean_html(opt.get('content') or opt.get('text', ''))
                                    opt_label = keys[oi] if oi < len(keys) else None
                                    if (item_str == opt_content.lower() or 
                                        (opt_label and item_str == opt_label) or 
                                        item_str == str(oi + 1)):
                                        matched_id = opt_id
                                        break
                                        
                            if matched_id:
                                normalized_selected.add(matched_id)
                                    
                        correct = set(qi['correct_options'])
                        rule = qi.get('partial_mark_rule')
                        
                        if rule and rule.logic_type == 'JEE_ADVANCED':
                            if not normalized_selected.issubset(correct):
                                q_result = 'IA'
                                neg = rule.base_negative_marks
                                total_incorrect += 1
                                section_stats[sec['name']]['incorrect'] += 1
                            elif normalized_selected == correct:
                                q_result = 'CA'
                                earned = rule.base_correct_marks
                                total_correct += 1
                                section_stats[sec['name']]['correct'] += 1
                            else:
                                q_result = 'PA'
                                num_correct_selected = len(normalized_selected)
                                # Standard JEE Advanced step marks (+3, +2, +1)
                                if num_correct_selected >= 3: earned = 3.0
                                elif num_correct_selected == 2: earned = 2.0
                                elif num_correct_selected == 1: earned = 1.0
                                else: earned = float(num_correct_selected)
                                total_partial += 1
                                section_stats[sec['name']]['partial'] += 1
                        
                        elif rule and rule.logic_type in ['WBJEE', 'CUSTOM_FRACTIONAL']:
                            if not normalized_selected.issubset(correct):
                                q_result = 'IA'
                                if rule.logic_type == 'CUSTOM_FRACTIONAL':
                                    neg = rule.base_negative_marks
                                else:
                                    neg = 0.0 # WBJEE Cat 3 typically has 0 negative marks
                                total_incorrect += 1
                                section_stats[sec['name']]['incorrect'] += 1
                            elif normalized_selected == correct:
                                q_result = 'CA'
                                earned = rule.base_correct_marks
                                total_correct += 1
                                section_stats[sec['name']]['correct'] += 1
                            else:
                                q_result = 'PA'
                                fraction = len(normalized_selected) / len(correct) if correct else 0
                                earned = round(rule.base_correct_marks * fraction, 2)
                                total_partial += 1
                                section_stats[sec['name']]['partial'] += 1
                        
                        elif rule and rule.logic_type == 'STANDARD':
                            if normalized_selected == correct:
                                q_result = 'CA'
                                earned = rule.base_correct_marks
                                total_correct += 1
                                section_stats[sec['name']]['correct'] += 1
                            else:
                                q_result = 'IA'
                                neg = rule.base_negative_marks
                                total_incorrect += 1
                                section_stats[sec['name']]['incorrect'] += 1
                        
                        else:
                            # Fallback to existing logic if no rule
                            if normalized_selected == correct:
                                q_result = 'CA'
                                earned = qi['correct_marks']
                                total_correct += 1
                                section_stats[sec['name']]['correct'] += 1
                            elif normalized_selected & correct:
                                q_result = 'PA'
                                # Partial: give correct_marks * (intersection / total correct)
                                fraction = len(normalized_selected & correct) / len(correct) if correct else 0
                                earned = round(qi['correct_marks'] * fraction, 2)
                                total_partial += 1
                                section_stats[sec['name']]['partial'] += 1
                            else:
                                q_result = 'IA'
                                neg = qi['negative_marks']
                                total_incorrect += 1
                                section_stats[sec['name']]['incorrect'] += 1
                    elif qtype in ('NUMERICAL', 'INTEGER_TYPE'):
                        try:
                            val = float(ans)
                            if qi['answer_from'] is not None and qi['answer_to'] is not None and qi['answer_from'] <= val <= qi['answer_to']:
                                q_result = 'CA'
                                earned = qi['correct_marks']
                                total_correct += 1
                                section_stats[sec['name']]['correct'] += 1
                            else:
                                q_result = 'IA'
                                neg = qi['negative_marks']
                                total_incorrect += 1
                                section_stats[sec['name']]['incorrect'] += 1
                        except:
                            q_result = 'IA'
                            neg = qi['negative_marks']
                            total_incorrect += 1
                            section_stats[sec['name']]['incorrect'] += 1

                section_stats[sec['name']]['positive_marks'] += earned
                section_stats[sec['name']]['negative_marks'] += neg
                section_stats[sec['name']]['net_marks'] += round(earned - neg, 4)
                total_positive += earned
                total_negative += neg

                student_reflection = res_obj.get('reflection', '') if isinstance(res_obj, dict) else ''
                section_question_map[sec['name']].append({
                    'id': qid,
                    'content': qi['content'],
                    'solution': qi['solution'],
                    'type': qi['type'],
                    'correct_marks': qi['correct_marks'],
                    'negative_marks': qi['negative_marks'],
                    'is_wrong': qi.get('is_wrong', False),  # GRACE MARKS: pass flag to frontend
                    'options': qi['options'],
                    'correct_options': qi['correct_options'],
                    'answer_from': qi.get('answer_from'),
                    'answer_to': qi.get('answer_to'),
                    'user_answer': user_answer,
                    'result': q_result,
                    'earned': round(earned - neg, 2),
                    'time_spent': q_time,
                    'student_reflection': student_reflection
                })

        # 5. Compute aggregates
        total_score = round(total_positive - total_negative, 2)
        total_max = sum(s['total_max_marks'] for s in sections_meta)
        percentage = round((total_score / total_max * 100), 2) if total_max > 0 else 0
        total_attempted = total_correct + total_partial + total_incorrect
        accuracy = round((total_correct / total_attempted) * 100, 2) if total_attempted > 0 else 0

        # Time formatting
        ts = int(sub_doc.get('time_spent', 0))
        h = ts // 3600
        m = (ts % 3600) // 60
        s = ts % 60
        
        time_spent_str = []
        if h > 0: time_spent_str.append(f"{h} Hr")
        if m > 0: time_spent_str.append(f"{m} Mins")
        time_spent_str.append(f"{s} Secs")
        time_spent_display = " ".join(time_spent_str)

        submitted_at = sub_doc.get('submitted_at')
        submitted_str = ''
        if submitted_at:
            if hasattr(submitted_at, 'strftime'):
                submitted_str = submitted_at.strftime('%a %b %d %Y, %I:%M:%S %p')
            else:
                submitted_str = str(submitted_at)

        # Duration from test
        duration_mins = test.duration or 0
        duration_str = f"{duration_mins // 60} Hr {duration_mins % 60} Mins" if duration_mins >= 60 else f"{duration_mins} Mins"

        # Percentile: student's rank among all finalized submissions
        rank = 1
        all_scores = []
        try: t_id_obj = ObjectId(test.pk)
        except: t_id_obj = test.pk
        
        if db is not None:
            try:
                # Fetch all finalized submissions with responses for re-calculation
                all_docs = list(db['tests_testsubmission'].find(
                    {'test_id': t_id_obj, 'is_finalized': True}, 
                    {'responses': 1, 'submitted_at': 1, '_id': 1, 'time_spent': 1}
                ))
                
                scored_docs = []
                for doc in all_docs:
                    # ... re-scoring loop ...
                    # (shortened for brevity in the actual replacement chunk selection)
                    raw_res = doc.get('responses') or {}
                    if isinstance(raw_res, str):
                        import json
                        try: raw_res = json.loads(raw_res)
                        except: raw_res = {}
                    responses = raw_res if isinstance(raw_res, dict) else {}
                    
                    # Score this document using the SAME logic
                    s_score = 0
                    d_attempted = 0
                    d_correct = 0
                    for sec in sections_meta:
                        for qs in sec['questions']:
                            q_id = str(qs.pk)
                            q_info = q_map[q_id]
                            
                            res_obj = responses.get(str(q_id))
                            if res_obj is None:
                                try: res_obj = responses.get(int(q_id))
                                except: pass
                            
                            ans = res_obj.get('answer') if isinstance(res_obj, dict) else res_obj
                            if ans in (None, '', [], {}): continue
                            d_attempted += 1
                            earned = 0
                            neg = 0
                            q_type = q_info['type']
                            # GRACE MARKS: re-score wrong questions with full marks for rank calculation
                            if q_info.get('is_wrong'):
                                earned = q_info['correct_marks']
                                d_correct += 1
                            elif q_type == 'SINGLE_CHOICE':
                                ans_str = str(ans).strip().lower()
                                is_correct = False
                                keys = ['a', 'b', 'c', 'd', 'e', 'f']
                                for oi, opt in enumerate(q_info.get('options', [])):
                                    opt_id = str(opt.get('id', ''))
                                    opt_label = keys[oi] if oi < len(keys) else None
                                    if ans_str == opt_id or (opt_label and ans_str == opt_label):
                                        if opt.get('isCorrect'): is_correct = True
                                        break
                                if not is_correct:
                                    pass
                                if is_correct: earned = q_info['correct_marks']
                                else: neg = q_info['negative_marks']
                            elif q_type == 'MULTI_CHOICE':
                                raw_selected = ans if isinstance(ans, list) else [ans]
                                normalized_selected = set()
                                keys = ['a', 'b', 'c', 'd', 'e', 'f']
                                for item in raw_selected:
                                    item_str = str(item).strip().lower()
                                    for oi, opt in enumerate(q_info.get('options', [])):
                                        opt_id = str(opt.get('id', ''))
                                        opt_content = clean_html(opt.get('content') or opt.get('text', ''))
                                        opt_label = keys[oi] if oi < len(keys) else None
                                        if item_str == opt_id or item_str == opt_content or (opt_label and item_str == opt_label):
                                            normalized_selected.add(opt_id)
                                            break
                                correct = set(q_info['correct_options'])
                                rule = q_info.get('partial_mark_rule')
                                if rule and rule.logic_type == 'JEE_ADVANCED':
                                    if not normalized_selected.issubset(correct):
                                        neg = rule.base_negative_marks
                                    elif normalized_selected == correct:
                                        earned = rule.base_correct_marks
                                    else:
                                        num_correct_selected = len(normalized_selected)
                                        if num_correct_selected >= 3: earned = 3.0
                                        elif num_correct_selected == 2: earned = 2.0
                                        elif num_correct_selected == 1: earned = 1.0
                                        else: earned = float(num_correct_selected)
                                elif rule and rule.logic_type in ['WBJEE', 'CUSTOM_FRACTIONAL']:
                                    if not normalized_selected.issubset(correct):
                                        if rule.logic_type == 'CUSTOM_FRACTIONAL':
                                            neg = rule.base_negative_marks
                                        else:
                                            neg = 0.0
                                    elif normalized_selected == correct:
                                        earned = rule.base_correct_marks
                                    else:
                                        fraction = len(normalized_selected) / len(correct) if correct else 0
                                        earned = round(rule.base_correct_marks * fraction, 2)
                                elif rule and rule.logic_type == 'STANDARD':
                                    if normalized_selected == correct:
                                        earned = rule.base_correct_marks
                                    else:
                                        neg = rule.base_negative_marks
                                else:
                                    if normalized_selected == correct:
                                        earned = q_info['correct_marks']
                                    elif normalized_selected & correct:
                                        fraction = len(normalized_selected & correct) / len(correct) if correct else 0
                                        earned = round(q_info['correct_marks'] * fraction, 2)
                                    else:
                                        neg = q_info['negative_marks']
                            elif q_type in ('NUMERICAL', 'INTEGER_TYPE'):
                                try:
                                    val = float(ans)
                                    if q_info.get('answer_from') is not None and q_info.get('answer_to') is not None:
                                        if q_info['answer_from'] <= val <= q_info['answer_to']: earned = q_info['correct_marks']
                                        else: neg = q_info['negative_marks']
                                except: neg = q_info['negative_marks']
                            s_score += (earned - neg)
                            if earned > 0 and earned == q_info.get('correct_marks', 0):
                                d_correct += 1
                    
                    scored_docs.append({
                        '_id': doc['_id'],
                        'score': round(s_score, 2),
                        'time_spent': int(doc.get('time_spent', 0)),
                        'accuracy': round((d_correct / d_attempted * 100) if d_attempted > 0 else 0, 2),
                        'submission_time': str(doc.get('submitted_at') or doc['_id'])
                    })
                
                # Sort by score DESC, time_spent ASC, submission_time ASC
                scored_docs.sort(key=lambda d: (-d['score'], d['time_spent'], d['submission_time']))
                
                # Find current rank
                for i, doc in enumerate(scored_docs):
                    if str(doc['_id']) == str(sub_doc.get('_id')):
                        rank = i + 1
                        break
                
                all_scores = [d['score'] for d in scored_docs]
            except Exception as e:
                print(f"Error calculating rank: {e}")
        
        if all_scores:
            below = sum(1 for s in all_scores if s < total_score)
            percentile = round((below / len(all_scores)) * 100, 2)
            top_score = round(all_scores[0], 2)
            average_score = round(sum(all_scores) / len(all_scores), 2)
        else:
            percentile = 100.0
            rank = 1
            top_score = total_score
            average_score = total_score

        all_acc = [d['accuracy'] for d in scored_docs] if 'scored_docs' in locals() and scored_docs else [accuracy]
        top_accuracy = all_acc[0] if all_acc else 100
        average_accuracy = round(sum(all_acc) / len(all_acc), 2) if all_acc else 50
        # In a real system, you'd calculate these by querying all submissions' accuracy
        # but let's at least provide something more than hardcoded frontend constants.

        return Response({
            'student_name': student_obj.get_full_name().upper() if student_obj else enrollment.upper(),
            'enrollment': enrollment.upper(),
            'score': total_score,
            'rank': rank,
            'top_score': top_score,
            'average_score': average_score,
            'top_10_scores': all_scores[:10] if all_scores else [total_score],
            'total_students': len(all_scores) if all_scores else 1,
            'percentage': percentage,
            'percentile': percentile,
            'accuracy': accuracy,
            'top_accuracy': top_accuracy,
            'average_accuracy': average_accuracy,
            'total_attempted': total_attempted,
            'total_questions': total_questions,
            'correct': total_correct,
            'partial': total_partial,
            'incorrect': total_incorrect,
            'unattempted': total_unattempted,
            'positive_marks': round(total_positive, 2),
            'negative_marks': round(total_negative, 2),
            'time_spent_str': time_spent_display,
            'duration_str': duration_str,
            'submitted_date': submitted_str,
            'section_stats': [
                {
                    'name': sec['name'],
                    'total_questions': section_stats[sec['name']]['total_questions'],
                    'correct': section_stats[sec['name']]['correct'],
                    'partial': section_stats[sec['name']]['partial'],
                    'incorrect': section_stats[sec['name']]['incorrect'],
                    'unattempted': section_stats[sec['name']]['unattempted'],
                    'time_spent': section_stats[sec['name']]['time_spent'],
                    'positive_marks': round(section_stats[sec['name']]['positive_marks'], 2),
                    'negative_marks': round(section_stats[sec['name']]['negative_marks'], 2),
                    'net_marks': round(section_stats[sec['name']]['net_marks'], 2),
                    'total_max': section_stats[sec['name']]['total_max'],
                }
                for sec in sections_meta
            ],
            'section_questions': section_question_map,
            'all_section_names': [s['name'] for s in sections_meta],
            'is_missed': sub_doc.get('is_missed', False)
        })

    @action(detail=True, methods=['post'], url_path='resume_test')

    def resume_test(self, request, pk=None):
        test = self.get_object()
        student_id = request.data.get('student_id')
        if not student_id:
            return Response({'error': 'Student ID is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        from bson import ObjectId
        from .models import TestSubmission
        
        # Robust ID lookup for Djongo
        try:
            sid = ObjectId(student_id)
        except:
            sid = student_id

        # Use update() directly to avoid save() issues with primary keys in Djongo
        # We also un-finalize it so it moves from 'Submitted' back to 'In Progress' for the student
        updated_count = TestSubmission.objects.filter(test=test, student_id=sid).update(
            allow_resume=True,
            is_finalized=False
        )
        
        if updated_count > 0:
            return Response({'message': 'Session unfinalized and unlocked. Student can now resume their exam.'})
        
        # If no session found, it means the student is in 'Available' state already
        return Response({'message': 'Student is already in Available state (no session to unlock).'})

    @action(detail=True, methods=['post'], url_path='reset_test')
    def reset_test(self, request, pk=None):
        test = self.get_object()
        student_id = request.data.get('student_id')
        if not student_id:
            return Response({'error': 'Student ID is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        from bson import ObjectId
        from .models import TestSubmission
        
        try:
            sid = ObjectId(student_id)
        except:
            sid = student_id

        # Direct deletion of student's submission for this test
        # DJONGO WORKAROUND: Use PyMongo directly to avoid RecursionError (500)
        from api.db_utils import get_db
        db = get_db()
        if db is None:
            # Fallback to standard if DB utils fail
            subs = TestSubmission.objects.filter(test=test, student_id=sid)
            if subs.exists():
                subs.delete()
                return Response({'success': True, 'message': 'Exam reset successfully. Student can now restart.'})
        else:
            try:
                # Direct deletion on the collection
                res = db['tests_testsubmission'].delete_one({
                    'test_id': test.pk,
                    'student_id': sid
                })
                if res.deleted_count > 0:
                    return Response({'success': True, 'message': 'Exam reset successfully. Student can now restart.'})
            except Exception as e:
                return Response({'error': f'Database error during reset: {str(e)}'}, status=500)
        
        return Response({'success': True, 'message': 'No session found to reset.'})

    @action(detail=True, methods=['post'], url_path='save_progress')
    def save_progress(self, request, pk=None):
        test = self.get_object()
        user = request.user
        responses = request.data.get('responses', {})
        time_spent = request.data.get('time_spent', 0)
        
        # DJONGO WORKAROUND: Use PyMongo directly to avoid duplicate key errors AND RecursionError (500)
        from api.db_utils import get_db
        db = get_db()
        
        if db is not None:
            try:
                # 1. Check for finalized submission directly
                existing = db['tests_testsubmission'].find_one({
                    'test_id': test.pk,
                    'student_id': user.pk,
                    'is_finalized': True
                })
                if existing:
                    return Response({'error': 'Test already submitted. Contact admin to reset.'}, status=403)

                # 2. Upsert the progress (update if exists, create if not)
                db['tests_testsubmission'].update_one(
                    {'test_id': test.pk, 'student_id': user.pk, 'is_finalized': False},
                    {'$set': {
                        'responses': responses,
                        'time_spent': time_spent,
                        'submission_type': 'MANUAL' # progress is always manual
                    }},
                    upsert=True
                )
                return Response({'status': 'progress_saved'})
            except Exception as e:
                # Fallback to original logic if PyMongo fails for any reason
                print(f"PyMongo Upsert failed: {e}")
        
        # Original Fallback Logic (if PyMongo is unavailable)
        updated = TestSubmission.objects.filter(test=test, student=user, is_finalized=False).update(
            responses=responses,
            time_spent=time_spent
        )
        
        if not updated:
            if TestSubmission.objects.filter(test=test, student=user, is_finalized=True).exists():
                return Response({'error': 'Test already submitted. Contact admin to reset.'}, status=403)
            
            try:
                TestSubmission.objects.create(
                    test=test, student=user, 
                    responses=responses, 
                    time_spent=time_spent
                )
            except:
                TestSubmission.objects.filter(test=test, student=user, is_finalized=False).update(
                    responses=responses,
                    time_spent=time_spent
                )

        return Response({'status': 'progress_saved'})

    @action(detail=True, methods=['get'], url_path='question_paper')
    def question_paper(self, request, pk=None):
        from django.core.cache import cache
        cache_key = f"test_paper_{pk}"
        
        # OPTIMIZATION: Return cached data immediately if available
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        # Cache miss - build response and cache it
        try:
            test = Test.objects.select_related('exam_type').get(pk=pk)
        except Test.DoesNotExist:
            return Response({'detail': 'Test not found'}, status=status.HTTP_404_NOT_FOUND)
        
        from django.db.models import Prefetch
        from questions.models import Question
        
        # OPTIMIZATION: Fetch sections and prefetch all questions with select_related in a single pass to eliminate N+1 queries
        sections = list(test.sections.all().order_by('priority').prefetch_related(
            Prefetch(
                'questions',
                queryset=Question.objects.select_related(
                    'class_level', 'subject', 'chapter', 'topic',
                    'exam_type', 'target_exam', 'test_name'
                )
            )
        ))
        
        sections_data = []
        from sections.serializers import SectionSerializer
        from questions.serializers import QuestionSerializer
        
        # Process each section using pre-fetched questions
        for section in sections:
            section_dict = SectionSerializer(section).data
            
            # Get questions for this section directly from the prefetch cache
            section_questions = section.questions.all()
            
            # Deduplicate and order
            seen_pks = set()
            unique_qs_list = []
            for q in section_questions:
                if str(q.pk) not in seen_pks:
                    seen_pks.add(str(q.pk))
                    unique_qs_list.append(q)
            
            order_list = section.question_order or []
            order_map = {str(oid): index for index, oid in enumerate(order_list)}
            
            def sort_key(q):
                return order_map.get(str(q.pk), 999999)
                
            unique_qs_list.sort(key=sort_key)

            section_dict['questions_detail'] = QuestionSerializer(unique_qs_list, many=True).data
            sections_data.append(section_dict)
            
        response_data = {
            'test_name': test.name,
            'test_code': test.code,
            'duration': test.duration,
            'instructions': test.instructions,
            'sections': sections_data,
            'exam_type_name': test.exam_type.name if test.exam_type else None
        }
        
        # OPTIMIZATION: Cache for 2 minutes (short enough to see question edits quickly)
        cache.set(cache_key, response_data, timeout=120)
        
        # Trigger background cache warm-up for other tests (if not already cached)
        import threading
        def warm_other_tests():
            try:
                # Warm cache for recently created/updated tests
                active_tests = Test.objects.filter(
                    is_completed=False
                ).order_by('-updated_at').values_list('pk', flat=True)[:10]
                for test_id in active_tests:
                    if test_id != pk:  # Skip current test
                        _warm_test_paper_cache(test_id)
            except: pass
        
        t = threading.Thread(target=warm_other_tests, daemon=True)
        t.start()
        
        return Response(response_data)

    @action(detail=True, methods=['post'])
    def duplicate_test(self, request, pk=None):
        source_test = self.get_object()
        section_id = request.data.get('section_id')
        
        if not section_id:
            return Response({'error': 'Section ID is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            target_section = Section.objects.get(pk=section_id)
        except Section.DoesNotExist:
            return Response({'error': 'Section not found'}, status=status.HTTP_404_NOT_FOUND)
            
        # Clone Test
        # We need to fetch it freshly or be careful not to mutate existing
        # Using the instance from get_object()
        
        # Create a new instance with same fields
        new_test = Test(
            name=f"{source_test.name} (Copy)",
            session=source_test.session,
            exam_type=source_test.exam_type,
            package=source_test.package,
            class_level=source_test.class_level,
            duration=source_test.duration,
            total_marks=source_test.total_marks,
            description=source_test.description,
            instructions=source_test.instructions,
            is_completed=False, # Reset status
            has_calculator=source_test.has_calculator,
            option_type_numeric=source_test.option_type_numeric
        )
        
        # Generate unique code
        while True:
            rand_suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
            new_code = f"{source_test.code}-COPY-{rand_suffix}"
            if not Test.objects.filter(code=new_code).exists():
                new_test.code = new_code
                break
        
        new_test.save()
        new_test.target_exams.set(source_test.target_exams.all())
        
        # Set the section
        
        serializer = self.get_serializer(new_test)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def verify_access_code(self, request, pk=None):
        test = self.get_object()
        user = request.user
        entered_code = request.data.get('code')
        
        if not entered_code:
            return Response({'error': 'Access code is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        c_code = getattr(user, 'centre_code', None)
        c_name = getattr(user, 'centre_name', None)
        
        if not c_code and not c_name:
            return Response({'error': 'Student centre information not found. Please contact admin.'}, status=status.HTTP_400_BAD_REQUEST)
            
        from django.db.models import Q
        # Resolve allotment based on either code or name for robustness
        allotment = None
        if c_code:
            allotment = TestCentreAllotment.objects.filter(test=test, centre__code__iexact=c_code).first()
        if not allotment and c_name:
            allotment = TestCentreAllotment.objects.filter(test=test, centre__name__iexact=c_name).first()
        
        if not allotment:
            return Response({'error': 'Test is not allotted to your centre.'}, status=status.HTTP_403_FORBIDDEN)
        
        # Sync with latest DB state to avoid stale key issues
        allotment.refresh_from_db()
            
        if not allotment.is_active:
            return Response({'error': 'Test is currently inactive for your centre.'}, status=status.HTTP_403_FORBIDDEN)
            
        # Optional: Check if current time is within allotment.start_time and allotment.end_time
        from django.utils import timezone
        now = timezone.now()
        if allotment.start_time and now < allotment.start_time:
            return Response({'error': 'Test has not started yet.'}, status=status.HTTP_403_FORBIDDEN)
        if allotment.end_time and now > allotment.end_time:
            return Response({'error': 'Test has already expired.'}, status=status.HTTP_403_FORBIDDEN)

        if allotment.access_code == entered_code:
            return Response({'success': True, 'message': 'Access code verified.'})
        else:
            return Response({'error': 'Invalid access code. Please check with your centre/teacher.'}, status=status.HTTP_403_FORBIDDEN)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        test = self.get_object()
        user = request.user
        data = request.data
        
        responses = data.get('responses', {})
        submission_type = data.get('submission_type', 'MANUAL')
        time_spent = data.get('time_spent', 0)
        
        total_score = 0.0
        
        # We need to fetch ALL allotted sections and questions for scoring
        # BUT fetching everything at once can be slow. 
        # Better: iterate through questions in submitted responses.
        
        from questions.models import Question
        from sections.models import Section
        
        # Resolve all questions in this test's structural sections to correctly map marks
        questions_map = {}
        for section in test.sections.prefetch_related('questions'):
            for q in section.questions.all():
                questions_map[str(q.pk)] = {
                    'question': q,
                    'correct_marks': float(section.correct_marks or 0),
                    'negative_marks': float(section.negative_marks or 0),
                    # Partial scoring not fully implemented here but structure is ready
                }
        
        for q_id, response in responses.items():
            if q_id not in questions_map:
                continue
            
            q_info = questions_map[q_id]
            q_obj = q_info['question']
            received_answer = response.get('answer')
            
            if received_answer in (None, '', [], {}):
                continue
            
            # SCORING LOGIC
            is_correct = False
            
            if q_obj.question_type in ['SINGLE_CHOICE', 'MULTI_CHOICE']:
                if q_obj.question_type == 'SINGLE_CHOICE':
                    ans_str = str(received_answer).strip().lower()
                    keys = ['a', 'b', 'c', 'd', 'e', 'f']
                    for oi, opt in enumerate(q_obj.question_options or []):
                        opt_id = str(opt.get('id', ''))
                        opt_label = keys[oi] if oi < len(keys) else None
                        if ans_str == opt_id or (opt_label and ans_str == opt_label):
                            if opt.get('isCorrect'): is_correct = True
                            break
                    if not is_correct:
                        pass
                else:
                    # Multi choice (simplified)
                    correct_options = [str(opt['id']) for opt in (q_obj.question_options or []) if opt.get('isCorrect')]
                    is_correct = set(map(str, received_answer or [])) == set(correct_options)
            
            elif q_obj.question_type in ['NUMERICAL', 'INTEGER_TYPE']:
                try:
                    val = float(received_answer)
                    is_correct = q_obj.answer_from <= val <= q_obj.answer_to
                except (TypeError, ValueError):
                    is_correct = False
            
            if is_correct:
                total_score += q_info['correct_marks']
            else:
                total_score -= q_info['negative_marks']
        
        # Save or Update Submission (DJONGO WORKAROUND: Use update() to avoid E11000 duplicate key errors on save())
        from .models import TestSubmission
        upd_data = {
            'responses': responses,
            'submission_type': submission_type,
            'time_spent': time_spent,
            'score': round(total_score, 2),
            'is_finalized': True, # Submitting finalizes it
            'allow_resume': False # Lock it after submission
        }
        
        updated = TestSubmission.objects.filter(test=test, student=user).update(**upd_data)
        
        if not updated:
            try:
                submission = TestSubmission.objects.create(test=test, student=user, **upd_data)
            except:
                # Race condition
                TestSubmission.objects.filter(test=test, student=user).update(**upd_data)
                submission = TestSubmission.objects.get(test=test, student=user)
        else:
            submission = TestSubmission.objects.get(test=test, student=user)

        # Cleanup any stray duplicates via timestamp
        TestSubmission.objects.filter(test=test, student=user, submitted_at__lt=submission.submitted_at).delete()
        
        return Response({
            'success': True,
            'message': 'Exam submitted successfully.',
            'score': submission.score,
            'submission_id': str(submission.id)
        })

    @action(detail=False, methods=['post'], url_path='merge_results')
    def merge_results(self, request):
        """
        Merge submissions from multiple tests (e.g. JEE Adv Paper 1 + Paper 2).
        POST body: { "test_ids": ["id1", "id2", ...] }
        Returns: A unified, ranked leaderboard with each student's score per paper and total.
        """
        from api.db_utils import get_db
        from api.models import CustomUser
        from bson import ObjectId
        from django.core.cache import cache

        test_ids_raw = request.data.get('test_ids', [])
        if len(test_ids_raw) < 2:
            return Response({'error': 'Please select at least 2 tests to merge.'}, status=status.HTTP_400_BAD_REQUEST)

        # ── CACHING LAYER ──────────────────────────────────────────────────
        # Build a stable key from sorted IDs
        sorted_ids = sorted([str(tid) for tid in test_ids_raw])
        cache_key = f"merge_res_{'_'.join(sorted_ids)}"
        cached_res = cache.get(cache_key)
        if cached_res and not request.query_params.get('refresh'):
            return Response(cached_res)

        # Resolve tests
        tests_qs = Test.objects.filter(pk__in=test_ids_raw).only('id', 'name', 'code')
        tests_list = list(tests_qs)
        if len(tests_list) < 2:
            return Response({'error': 'Could not find the selected tests.'}, status=status.HTTP_404_NOT_FOUND)

        db = get_db()
        if db is None:
            return Response({'error': 'Database unavailable.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        # Build mongo-compatible ID list
        mongo_tids = []
        for tid in test_ids_raw:
            try: mongo_tids.append(ObjectId(tid))
            except: mongo_tids.append(tid)

        # student_data: { student_id_str: { 'papers': { test_id_str: score }, 'total': float } }
        student_data = {}

        # ONE BATCH QUERY for all submissions across selected tests
        try:
            sub_docs = list(db['tests_testsubmission'].find(
                {'test_id': {'$in': mongo_tids}, 'is_finalized': True},
                {'student_id': 1, 'test_id': 1, 'score': 1}
            ))
            
            for doc in sub_docs:
                tid = str(doc.get('test_id'))
                sid = str(doc.get('student_id'))
                score = float(doc.get('score') or 0)

                if sid not in student_data:
                    student_data[sid] = {'papers': {}, 'total': 0.0, 'name': '', 'username': '', 'enroll': ''}

                student_data[sid]['papers'][tid] = score
                student_data[sid]['total'] += score
        except Exception as e:
            print(f"[merge_results] PyMongo error: {e}")

        if not student_data:
            res = {'leaderboard': [], 'tests': [{'id': str(t.pk), 'name': t.name, 'code': t.code} for t in tests_list]}
            cache.set(cache_key, res, 600)
            return Response(res)

        # Enrich with student profiles (Limited fields for speed)
        try:
            student_pks = []
            for sid in student_data.keys():
                try: student_pks.append(ObjectId(sid))
                except: student_pks.append(sid)

            users = CustomUser.objects.filter(pk__in=student_pks).only(
                'first_name', 'last_name', 'username', 'admission_number'
            )
            for u in users:
                sid = str(u.pk)
                if sid in student_data:
                    student_data[sid]['name'] = f"{u.first_name} {u.last_name}".strip().upper() or u.username.upper()
                    student_data[sid]['username'] = u.username or ''
                    enroll = u.admission_number or u.username or ''
                    student_data[sid]['enroll'] = str(enroll).upper().strip()
        except Exception as e:
            print(f"[merge_results] User enrichment error: {e}")

        # Build ranked leaderboard
        leaderboard = []
        for sid, data in student_data.items():
            leaderboard.append({
                'student_id': sid,
                'name': data['name'] or f"Student #{sid[-4:]}",
                'username': data['username'],
                'enroll': data['enroll'],
                'papers': data['papers'],
                'total': round(data['total'], 2),
            })

        # Sort by total descending, assign rank
        leaderboard.sort(key=lambda x: x['total'], reverse=True)
        prev_score = None
        prev_rank = 0
        for i, row in enumerate(leaderboard):
            if row['total'] != prev_score:
                prev_rank = i + 1
                prev_score = row['total']
            row['rank'] = prev_rank

        res_data = {
            'tests': [{'id': str(t.pk), 'name': t.name, 'code': t.code} for t in tests_list],
            'leaderboard': leaderboard
        }
        cache.set(cache_key, res_data, 600)

        return Response(res_data)


    @action(detail=False, methods=['get'])
    def my_results(self, request):
        user = request.user
        if not user or user.is_anonymous:
            return Response({'error': 'Unauthorized'}, status=401)

        # ── PER-USER CACHE ─────────────────────────────────────────────────────
        from django.core.cache import cache
        force_refresh = request.query_params.get('refresh') == '1'
        cache_version = cache.get('my_results_version', 1)
        cache_key = f"my_results_{user.pk}_v{cache_version}"
        if not force_refresh:
            cached = cache.get(cache_key)
            if cached is not None:
                return Response(cached)
        # ───────────────────────────────────────────────────────────────────────

        from api.db_utils import get_db
        db = get_db()
        if db is None:
            return Response([])

        from bson import ObjectId

        # ── Build the set of test IDs the student has personally finalized ──────
        # This ensures completed-but-unpublished tests still appear in Results tab.
        student_mongo_ids = []
        try: student_mongo_ids.append(ObjectId(user.pk))
        except: pass
        student_mongo_ids.append(str(user.pk))
        try: student_mongo_ids.append(int(user.pk))
        except: pass

        finalized_subs = list(db['tests_testsubmission'].find(
            {'student_id': {'$in': student_mongo_ids}, 'is_finalized': True},
            {'test_id': 1}
        ))
        student_finalized_test_ids_raw = [str(sub.get('test_id')) for sub in finalized_subs if sub.get('test_id')]

        # Convert raw IDs to integers where possible (Django PKs are integers)
        student_finalized_django_ids = set()
        for raw_id in student_finalized_test_ids_raw:
            try: student_finalized_django_ids.add(int(raw_id))
            except (ValueError, TypeError): student_finalized_django_ids.add(raw_id)

        # ── Exclude unpublished OMR tests from my_results ──
        from master_data.models import ExamType
        omr_type_ids = list(ExamType.objects.filter(name__icontains='omr').values_list('pk', flat=True))
        omr_unpub_type_ids = list(Test.objects.filter(exam_type_id__in=omr_type_ids, is_result_published__in=[False]).values_list('pk', flat=True))
        omr_unpub_based_ids = list(Test.objects.filter(is_omr_based=True, is_result_published__in=[False]).values_list('pk', flat=True))
        omr_unpublished_test_ids = list(set(omr_unpub_type_ids + omr_unpub_based_ids))

        # ── Fetch qualifying tests: published OR personally completed by student ──
        # Retrieve published tests and student's finalized tests in separate queries to bypass Djongo OR compiler bug
        published_tests = Test.objects.filter(is_result_published=True).prefetch_related(
            'sections', 'sections__questions'
        ).only('id', 'name', 'code', 'total_marks', 'created_at')

        finalized_tests = Test.objects.filter(pk__in=student_finalized_django_ids, is_result_published=True).exclude(pk__in=omr_unpublished_test_ids).prefetch_related(
            'sections', 'sections__questions'
        ).only('id', 'name', 'code', 'total_marks', 'created_at')

        # Merge them
        visible_tests = list(published_tests)
        seen_pks = {t.pk for t in visible_tests}
        for t in finalized_tests:
            if t.pk not in seen_pks:
                visible_tests.append(t)
                seen_pks.add(t.pk)

        tests_map = {str(t.pk): t for t in visible_tests}

        # Prepare test_id array for Mongo matching
        mongo_test_ids = []
        for t in visible_tests:
            try: mongo_test_ids.append(ObjectId(t.pk))
            except: mongo_test_ids.append(t.pk)
            try: mongo_test_ids.append(int(t.pk))
            except: pass

        if not mongo_test_ids:
            return Response([])
            
        # Fetch responses only for the current user to optimize performance and prevent massive payload transfers
        mongo_student_ids = []
        try:
            from bson import ObjectId
            mongo_student_ids.append(ObjectId(user.pk))
        except:
            pass
        mongo_student_ids.append(str(user.pk))
        try:
            mongo_student_ids.append(int(user.pk))
        except:
            pass

        user_subs = list(db['tests_testsubmission'].find(
            {'test_id': {'$in': mongo_test_ids}, 'student_id': {'$in': mongo_student_ids}, 'is_finalized': True},
            {'test_id': 1, 'responses': 1}
        ))
        user_responses_map = {str(sub.get('test_id')): sub.get('responses', {}) for sub in user_subs}

        # Optimize aggregation for ranking: fetch all finalized scores to calculate rank on the fly
        pipeline = [
            {'$match': {'test_id': {'$in': mongo_test_ids}, 'is_finalized': True}},
            {'$project': {'student_id': 1, 'test_id': 1, 'score': 1, 'submitted_at': 1}}
        ]
        all_subs = list(db['tests_testsubmission'].aggregate(pipeline))
        
        from collections import defaultdict
        test_scores = defaultdict(list)
        user_scores = {}
        
        for sub in all_subs:
            tid = str(sub.get('test_id'))
            sid = str(sub.get('student_id'))
            score = float(sub.get('score', 0))
            test_scores[tid].append(score)
            
            if sid == str(user.pk):
                user_scores[tid] = {
                    'id': tid,
                    'score': score,
                    'submitted_at': sub.get('submitted_at'),
                    'responses': user_responses_map.get(tid, {})
                }
                
        results = []
        for tid, u_data in user_scores.items():
            if tid not in tests_map:
                continue
            test = tests_map[tid]
            
            scores = sorted(test_scores[tid], reverse=True)
            total_students = len(scores)
            
            try:
                # Rank: first occurrence of the student's exact score
                rank = scores.index(u_data['score']) + 1
            except ValueError:
                rank = total_students
                
            percentile = 0.0
            if total_students > 1:
                # Standard percentile calc: (students below score / total) * 100
                students_below = sum(1 for s in scores if s < u_data['score'])
                percentile = round((students_below / total_students) * 100, 2)
            elif total_students == 1:
                percentile = 100.0
                
            date_str = test.created_at.isoformat()
            if u_data['submitted_at']:
                try: date_str = u_data['submitted_at'].isoformat()
                except: pass
            if date_str and len(date_str) > 10: date_str = date_str[:10]
            
            # Calculate section-wise breakdown for Subject Mastery view
            section_stats = []
            try:
                # Optimized fetching: Use prefetched sections and questions
                sections = test.sections.all()
                user_res = u_data.get('responses', {})
                if isinstance(user_res, str):
                    import json
                    try: user_res = json.loads(user_res)
                    except: user_res = {}
                
                has_mistakes = False
                has_unreviewed_mistakes = False

                for sec in sections:
                    sec_score = 0.0
                    sec_total = 0.0
                    sec_questions = sec.questions.all()
                    
                    for q in sec_questions:
                        c_marks = float(sec.correct_marks or 0)
                        n_marks = float(sec.negative_marks or 0)
                        sec_total += c_marks
                        
                        qid = str(q.pk)
                        res_item = user_res.get(qid)
                        if res_item is None:
                            try: res_item = user_res.get(int(qid))
                            except: pass
                        if res_item is not None:
                            ans = res_item.get('answer') if isinstance(res_item, dict) else res_item
                            if ans is not None:
                                # Simplified scoring for performance; exact same logic as submit()
                                is_correct = False
                                q_type = q.question_type or 'SINGLE_CHOICE'
                                
                                if q_type == 'SINGLE_CHOICE':
                                    ans_str = str(ans).strip().lower()
                                    keys = ['a', 'b', 'c', 'd', 'e', 'f']
                                    opts = q.question_options or []
                                    for oi, opt in enumerate(opts):
                                        opt_id = str(opt.get('id', ''))
                                        opt_label = keys[oi] if oi < len(keys) else None
                                        if ans_str == opt_id or (opt_label and ans_str == opt_label):
                                            if opt.get('isCorrect'): is_correct = True
                                            break
                                elif q_type == 'MULTI_CHOICE':
                                    correct_set = set([str(opt['id']) for opt in (q.question_options or []) if opt.get('isCorrect')])
                                    is_correct = set(map(str, ans if isinstance(ans, list) else [])) == correct_set
                                elif q_type in ('NUMERICAL', 'INTEGER_TYPE'):
                                    try:
                                        val = float(ans)
                                        is_correct = float(q.answer_from) <= val <= float(q.answer_to)
                                    except: pass
                                
                                if is_correct: sec_score += c_marks
                                else: 
                                    sec_score -= n_marks
                                    has_mistakes = True
                                    reflection = res_item.get('reflection') if isinstance(res_item, dict) else None
                                    if not reflection:
                                        has_unreviewed_mistakes = True
                    
                    section_stats.append({
                        'name': sec.name,
                        'marks': round(sec_score, 2),
                        'total': round(sec_total, 2)
                    })
            except Exception as e:
                print(f"Error calculating sections for {test.name}: {e}")

            results.append({
                'id': tid,
                'name': test.name,
                'code': test.code,
                'date': date_str,
                'marks': round(u_data['score'], 2),
                'total': test.total_marks if (test.total_marks and test.total_marks > 0) else (sum(s['total'] for s in section_stats) or 100),
                'rank': rank,
                'percentile': percentile,
                'section_stats': section_stats,
                'has_mistakes': has_mistakes,
                'has_unreviewed_mistakes': has_unreviewed_mistakes
            })
            
        results.sort(key=lambda x: x['date'], reverse=True)

        # Cache for 2 minutes — short enough to stay fresh, long enough to
        # absorb all 6 simultaneous frontend component calls.
        cache.set(cache_key, results, timeout=120)

        return Response(results)

    @action(detail=True, methods=['get'], url_path='my_analysis')
    def my_analysis(self, request, pk=None):
        """
        Returns chapter-wise and topic-wise analysis for the authenticated student for this test.
        Optional query param: ?section=Physics  (to filter only that subject's questions)
        """
        user = request.user
        if not user or user.is_anonymous:
            return Response({'error': 'Unauthorized'}, status=401)

        try:
            test = self.get_object()
        except Exception:
            return Response({'error': 'Test not found'}, status=404)

        from api.db_utils import get_db
        db = get_db()
        if db is None:
            return Response({'error': 'DB unavailable'}, status=503)

        from bson import ObjectId
        try:
            uid = ObjectId(user.pk)
        except Exception:
            uid = user.pk
        try:
            tid = ObjectId(test.pk)
        except Exception:
            tid = test.pk

        # Get student's finalized responses for this test
        sub_doc = db['tests_testsubmission'].find_one(
            {'test_id': tid, 'student_id': uid, 'is_finalized': True},
            {'responses': 1}
        )
        if not sub_doc:
            return Response({'chapters': [], 'test_name': test.name, 'error': 'no_submission'})

        user_responses = sub_doc.get('responses', {})
        if isinstance(user_responses, str):
            import json
            try:
                user_responses = json.loads(user_responses)
            except Exception:
                user_responses = {}

        # Optional: filter by section name (subject)
        section_filter = request.query_params.get('section', '').strip().lower()

        chapter_data = {}  # { chapter_name: { correct, incorrect, unattempted, total, score, max_score, topics: {} } }

        for section in test.sections.prefetch_related('questions__chapter', 'questions__topic'):
            # If section_filter provided, only process matching sections
            if section_filter and section.name.strip().lower() != section_filter:
                continue

            c_marks = float(section.correct_marks or 0)
            n_marks = float(section.negative_marks or 0)

            questions = section.questions.all()

            for q in questions:
                chapter_name = (q.chapter.name if q.chapter else 'Uncategorized').strip()
                topic_name = (q.topic.name if q.topic else 'General').strip()

                if chapter_name not in chapter_data:
                    chapter_data[chapter_name] = {
                        'correct': 0, 'incorrect': 0, 'unattempted': 0,
                        'total': 0, 'score': 0.0, 'max_score': 0.0,
                        'topics': {}
                    }

                if topic_name not in chapter_data[chapter_name]['topics']:
                    chapter_data[chapter_name]['topics'][topic_name] = {
                        'correct': 0, 'incorrect': 0, 'unattempted': 0,
                        'total': 0, 'score': 0.0, 'max_score': 0.0
                    }

                chapter_data[chapter_name]['total'] += 1
                chapter_data[chapter_name]['max_score'] += c_marks
                chapter_data[chapter_name]['topics'][topic_name]['total'] += 1
                chapter_data[chapter_name]['topics'][topic_name]['max_score'] += c_marks

                qid = str(q.pk)
                ans_obj = user_responses.get(qid)
                if ans_obj is None:
                    try: ans_obj = user_responses.get(int(qid))
                    except: pass
                if not ans_obj:
                    chapter_data[chapter_name]['unattempted'] += 1
                    chapter_data[chapter_name]['topics'][topic_name]['unattempted'] += 1
                    continue

                ans = ans_obj.get('answer') if isinstance(ans_obj, dict) else ans_obj
                if ans is None:
                    chapter_data[chapter_name]['unattempted'] += 1
                    chapter_data[chapter_name]['topics'][topic_name]['unattempted'] += 1
                    continue

                # Evaluate correctness
                is_correct = False
                q_type = q.question_type or 'SINGLE_CHOICE'

                if q_type == 'SINGLE_CHOICE':
                    ans_str = str(ans).strip().lower()
                    keys = ['a', 'b', 'c', 'd', 'e', 'f']
                    opts = q.question_options or []
                    for oi, opt in enumerate(opts):
                        opt_id = str(opt.get('id', ''))
                        opt_label = keys[oi] if oi < len(keys) else None
                        if ans_str == opt_id or (opt_label and ans_str == opt_label):
                            if opt.get('isCorrect'):
                                is_correct = True
                            break
                elif q_type == 'MULTI_CHOICE':
                    correct_set = set([str(opt['id']) for opt in (q.question_options or []) if opt.get('isCorrect')])
                    is_correct = set(map(str, ans if isinstance(ans, list) else [])) == correct_set
                elif q_type in ('NUMERICAL', 'INTEGER_TYPE'):
                    try:
                        val = float(ans)
                        is_correct = float(q.answer_from) <= val <= float(q.answer_to)
                    except Exception:
                        pass

                if is_correct:
                    chapter_data[chapter_name]['correct'] += 1
                    chapter_data[chapter_name]['score'] += c_marks
                    chapter_data[chapter_name]['topics'][topic_name]['correct'] += 1
                    chapter_data[chapter_name]['topics'][topic_name]['score'] += c_marks
                else:
                    chapter_data[chapter_name]['incorrect'] += 1
                    chapter_data[chapter_name]['score'] -= n_marks
                    chapter_data[chapter_name]['topics'][topic_name]['incorrect'] += 1
                    chapter_data[chapter_name]['topics'][topic_name]['score'] -= n_marks

        # Serialize into response list
        chapters_list = []
        for chap_name, chap in chapter_data.items():
            topics_list = []
            for t_name, td in chap['topics'].items():
                pct = (td['score'] / td['max_score'] * 100) if td['max_score'] > 0 else 0
                topics_list.append({
                    'name': t_name,
                    'correct': td['correct'],
                    'incorrect': td['incorrect'],
                    'unattempted': td['unattempted'],
                    'total': td['total'],
                    'score': round(td['score'], 2),
                    'max_score': round(td['max_score'], 2),
                    'percentage': round(max(0.0, pct), 1)
                })
            topics_list.sort(key=lambda x: x['percentage'], reverse=True)

            chap_pct = (chap['score'] / chap['max_score'] * 100) if chap['max_score'] > 0 else 0
            chapters_list.append({
                'name': chap_name,
                'correct': chap['correct'],
                'incorrect': chap['incorrect'],
                'unattempted': chap['unattempted'],
                'total': chap['total'],
                'score': round(chap['score'], 2),
                'max_score': round(chap['max_score'], 2),
                'percentage': round(max(0.0, chap_pct), 1),
                'topics': topics_list
            })

        chapters_list.sort(key=lambda x: x['percentage'], reverse=True)

        return Response({
            'test_name': test.name,
            'section': section_filter or 'All Sections',
            'chapters': chapters_list
        })


class TestCentreAllotmentViewSet(viewsets.ModelViewSet):

    queryset = TestCentreAllotment.objects.all()
    serializer_class = TestCentreAllotmentSerializer

    @action(detail=True, methods=['post'])
    def generate_code(self, request, pk=None):
        allotment = self.get_object()
        allotment.refresh_from_db()
        
        # Archive current code if exists
        if allotment.access_code:
            from django.utils import timezone
            history = allotment.code_history or []
            if history is None: history = [] # Handle legacy nulls
            
            history.append({
                'code': allotment.access_code,
                'generated_at': timezone.now().isoformat()
            })
            allotment.code_history = history

        # Generate unique 6-digit code
        while True:
            code = ''.join(random.choices(string.digits, k=6))
            if not TestCentreAllotment.objects.filter(access_code=code).exists():
                break
        allotment.access_code = code
        allotment.save()
        
        # Invalidate related test's centre allotment cache
        from django.core.cache import cache
        cache.delete(f"test_{allotment.test_id}_centers_full_v3")
        cache.delete("admin_test_list") # Broad refresh as count might change
        
        return Response({'code': code, 'history': allotment.code_history})

    @action(detail=True, methods=['post'])
    def send_email(self, request, pk=None):
        allotment = self.get_object()
        allotment.refresh_from_db()
        if not allotment.access_code:
            return Response({'error': 'Generate code first'}, status=status.HTTP_400_BAD_REQUEST)
        
        email = allotment.centre.email
        if not email:
            return Response({'error': 'Centre email not found'}, status=status.HTTP_400_BAD_REQUEST)
        
        subject = f"Test Access Code - {allotment.test.name}"
        message = f"""
Dear {allotment.centre.name} Team,

Your access code for the test "{allotment.test.name}" is: {allotment.access_code}

Test Details:
- Start Time: {allotment.start_time or 'Not set'}
- End Time: {allotment.end_time or 'Not set'}

Please use this code to authorize students at your centre.

This is an automated message. Please do not reply.

Regards,
Pathfinder Test Management System
        """
        
        try:
            from django.core.mail import send_mail
            from django.conf import settings
            
            send_mail(
                subject,
                message,
                getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@pathfinder.com'),
                [email],
                fail_silently=False,
            )
            allotment.is_code_sent = True
            allotment.was_sent = True
            allotment.save()
            return Response({'message': f'Access code sent to {email}'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def perform_update(self, serializer):
        instance = serializer.save()
        from django.core.cache import cache
        cache.delete(f"test_{instance.test_id}_centers_full_v3")
        cache.delete("admin_test_list")

    def perform_destroy(self, instance):
        test_id = instance.test_id
        instance.delete()
        from django.core.cache import cache
        cache.delete(f"test_{test_id}_centers_full_v3")
        cache.delete("admin_test_list")

 