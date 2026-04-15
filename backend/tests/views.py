from tests.models import TestSubmission
from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Test, TestCentreAllotment
from .serializers import TestSerializer, TestCentreAllotmentSerializer
from sections.models import Section
from sections.serializers import SectionSerializer
from questions.serializers import QuestionSerializer
import random
import string
import re

def clean_html(text):
    if not text: return ""
    return re.sub('<[^<]+?>', '', str(text)).strip().lower()

def _get_student_sections(obj, is_erp=False):
    from api.db_utils import parse_section
    if is_erp:
        sa = obj.get('sectionAllotment', {}) or {}
        return [s.lower().strip() for s in parse_section(sa.get('examSection'))] + \
               [s.lower().strip() for s in parse_section(sa.get('studySection'))]
    else:
        return [s.lower().strip() for s in parse_section(getattr(obj, 'exam_section', ''))] + \
               [s.lower().strip() for s in parse_section(getattr(obj, 'study_section', ''))]


class TestViewSet(viewsets.ModelViewSet):
    lookup_field = 'pk'
    serializer_class = TestSerializer

    def get_queryset(self):
        user = self.request.user
        
        # PERFORMANCE: List view doesn't need deep question details.
        # Fetch only what's visible in the Table.
        if self.action == 'list':
            queryset = Test.objects.all().select_related(
                'session', 'target_exam', 'exam_type', 'class_level', 'package'
            ).prefetch_related(
                'allotted_sections', 'centre_allotments', 'centres', 'sections', 'exam_type__target_exams'
            ).order_by('-created_at')
        else:
            # Full prefetch only for detail view or management tabs
            queryset = Test.objects.all().prefetch_related(
                'session', 'target_exam', 'exam_type', 'exam_type__target_exams', 'class_level', 'package',
                'allotted_sections', 'centres', 'sections', 'centre_allotments', 'centre_allotments__centre'
            ).order_by('-created_at')
        
        # If user is a student, enforce smart visibility rules
        # Main motiv: All students shouldn't see all exams, only privileged ones.
        if not user.is_staff and not user.is_superuser and getattr(user, 'user_type', None) == 'student':
            from api.db_utils import parse_section, get_db
            db = get_db()
            
            # Fetch ALL potential tests to filter in Python
            all_tests = list(queryset)
            visible_ids = []
            
            # Prep student metadata
            s_exams = [s.lower() for s in parse_section(getattr(user, 'exam_section', ''))]
            s_studies = [s.lower() for s in parse_section(getattr(user, 'study_section', ''))]
            student_sections = set(s_exams + s_studies)
            
            c_code = str(getattr(user, 'centre_code', '')).lower().strip()
            c_name = str(getattr(user, 'centre_name', '')).lower().strip()

            # Pre-fetch submission test IDs for this student
            submission_test_ids = set()
            if db is not None:
                try: 
                    sub_docs = list(db['tests_testsubmission'].find({'student_id': user.pk}, {'test_id': 1}))
                    submission_test_ids = {str(d['test_id']) for d in sub_docs}
                except: pass

            for t in all_tests:
                tid_str = str(t.pk)
                # 1. ALWAYS show if they have a submission
                if tid_str in submission_test_ids:
                    visible_ids.append(t.pk)
                    continue
                
                # 2. Centre AND Section check
                t_centres = t.centres.all()
                if not t_centres: continue
                
                match_centre = any(c_code == str(c.code).lower().strip() or c_name == str(c.name).lower().strip() for c in t_centres)
                if not match_centre: continue
                
                t_sections = [s.name.lower().strip() for s in t.allotted_sections.all()]
                # Only show if the student's section matches one of the allotted sections
                # This prevents tests with NO allotted sections from showing up to students.
                if t_sections and any(sec in student_sections for sec in t_sections):
                    visible_ids.append(t.pk)

            # Final re-filter
            queryset = queryset.filter(id__in=visible_ids).prefetch_related(
                'session', 'target_exam', 'exam_type', 'exam_type__target_exams', 'class_level', 'package',
                'centre_allotments', 'centre_allotments__centre'
            ).order_by('-created_at')
            if not visible_ids:
                queryset = queryset.none()
        
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
        
        # Auto-create allotment records for centres
        for centre in instance.centres.all():
            TestCentreAllotment.objects.get_or_create(test=instance, centre=centre)

    def perform_update(self, serializer):
        instance = serializer.save()
        
        # Clear related caches
        from django.core.cache import cache
        cache.delete("admin_test_list")
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
        from time import time
        
        is_staff = request.user.is_staff or request.user.is_superuser
        force_refresh = request.query_params.get('refresh', 'false').lower() == 'true'
        now = time()
        
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
        
        response = super().list(request, *args, **kwargs)
        
        if is_staff:
            # OPTIMIZATION INJECTION: calculate total_students in bulk!
            from api.db_utils import get_db
            db = get_db()
            if db is not None:
                try:
                    pipeline = [{"$group": {"_id": "$test_id", "count": {"$sum": 1}}}]
                    counts = list(db['tests_testsubmission'].aggregate(pipeline))
                    count_map = {str(item["_id"]): item["count"] for item in counts}
                    
                    data_items = response.data.get('results', []) if isinstance(response.data, dict) else response.data
                    if isinstance(data_items, list):
                        # 1. Submission Counts (Attempts)
                        for item in data_items:
                            item['total_students'] = count_map.get(str(item.get('id')), 0)
                            
                        # 2. Roster Counts (Allocated) - Bulk calculation to avoid N+1 hang
                        from api.db_utils import parse_section
                        from .models import Test
                        
                        test_ids = [item.get('id') for item in data_items]
                        all_tests = Test.objects.filter(id__in=test_ids).prefetch_related('allotted_sections', 'centres')
                        test_map = {t.id: t for t in all_tests}
                        
                        # Pre-process test criteria for fast matching
                        test_criteria = {}
                        for t_id in test_ids:
                            t = test_map.get(t_id)
                            if not t: continue
                            test_criteria[t_id] = {
                                'sections': set(s.name.strip().lower() for s in t.allotted_sections.all()),
                                'centres': set(c.name.strip().upper() for c in t.centres.all())
                            }
                        
                        roster_scores = {t_id: 0 for t_id in test_ids}
                        seen_students = {t_id: set() for t_id in test_ids}
                        
                        # Use the indexed values (already de-duplicated by ERP indexing logic)
                        from api.erp_views import get_student_lookup_index
                        erp_index = get_student_lookup_index(force_refresh=False)
                        if not erp_index: erp_index = {}

                        # Single pass over ERP students (O(S * N_page))
                        for erp in erp_index.values():
                            if not isinstance(erp, dict): continue
                            
                            # Identifiers for de-duplication per Test
                            adm = str(erp.get('admissionNumber') or '').strip().upper()
                            details = erp.get('student', {}).get('studentsDetails', [])
                            em = str(details[0].get('studentEmail') or '').strip().lower() if details else None
                            
                            # Get student's centre
                            c_raw = erp.get('centre')
                            if not c_raw:
                                v = erp.get('venue')
                                c_raw = (v.get('centreName') or v.get('name')) if isinstance(v, dict) else v
                            s_centre = str(c_raw or '').upper().strip()
                            if not s_centre: continue
                            
                            # Get student's sections
                            sa = erp.get('sectionAllotment', {})
                            s_sects = set([s.strip().lower() for s in parse_section(sa.get('examSection'))] + 
                                          [s.strip().lower() for s in parse_section(sa.get('studySection'))])
                            
                            if not s_sects: continue
                            
                            # Check against every test in current page
                            for t_id, criteria in test_criteria.items():
                                if s_centre in criteria['centres'] and (s_sects & criteria['sections']):
                                    # De-duplicate within the test's roster
                                    is_seen = (adm and adm in seen_students[t_id]) or (em and em in seen_students[t_id])
                                    if not is_seen:
                                        if adm: seen_students[t_id].add(adm)
                                        if em: seen_students[t_id].add(em)
                                        roster_scores[t_id] += 1
                        
                        # Inject results back into response data
                        for item in data_items:
                            item['total_roster_count'] = roster_scores.get(item.get('id'), 0)

                except Exception as e:
                    print(f"List Optimization Error: {e}")

            # Cache for a longer time (10 mins) to ensure speed, while allowing force-refresh
            cache.set("admin_test_list", response.data, 600)
            self.__class__._local_cache["admin_test_list"] = {'data': response.data, 'time': now}
            
        return response

    def destroy(self, request, *args, **kwargs):
        from django.core.cache import cache
        cache.delete("admin_test_list")
        self.__class__._local_cache = {}
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['get'])
    def sections(self, request, pk=None):
        try:
            test = Test.objects.get(pk=pk)
        except Test.DoesNotExist:
            return Response({'detail': 'Test not found'}, status=status.HTTP_404_NOT_FOUND)
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
                sub_docs = list(db['tests_testsubmission'].find({'test_id': test.pk}, {'student_id': 1}))
                if sub_docs:
                    student_pks = [d['student_id'] for d in sub_docs]
                    # Fetch student centre info and names for mapping
                    users = CustomUser.objects.filter(pk__in=student_pks)
                    for u in users:
                        all_subs_list.append({
                            'pk': u.pk,
                            'uid': (u.username or str(u.pk)).upper().strip(),
                            'adm': u.admission_number,
                            'email': u.email,
                            'c_code': str(u.centre_code or '').lower().strip(),
                            'c_name': str(u.centre_name or '').lower().strip()
                        })
            except Exception as e:
                print(f"PyMongo bypass error in 'centres': {e}")
        
        # Build ERP index EARLY for O(1) performance
        erp_index = get_student_lookup_index(force_refresh=force_refresh)

        # 3. Identify Extra Centres (not allotted but have submissions)
        extra_centres = []
        if all_subs_list:
            sub_c_codes = {d['c_code'] for d in all_subs_list if d['c_code']}
            sub_c_names = {d['c_name'] for d in all_subs_list if d['c_name']}
            if sub_c_codes or sub_c_names:
                extra_centres = list(Centre.objects.filter(
                    Q(code__in=sub_c_codes) | Q(name__in=sub_c_names)
                ).exclude(pk__in=allotted_centre_ids))

        # 4. Process all students and map to centres
        all_target_centres = [a.centre for a in all_allotments] + extra_centres
        centre_counts = {str(c.pk): {'sub': 0, 'roster': 0} for c in all_target_centres}
        
        global_seen_uids = set()
        unassigned_sub_count = 0
        allowed_sections_list = [s.name.strip().lower() for s in test.allotted_sections.all()]

        # Sub-Calculation Helper (O(1) where possible)
        def _get_student_sections(s_obj_or_dict, is_erp=False):
            if is_erp:
                sa = s_obj_or_dict.get('sectionAllotment', {}) or {}
                se = [sec.lower() for sec in parse_section(sa.get('examSection'))]
                ss = [sec.lower() for sec in parse_section(sa.get('studySection'))]
            else:
                se = [sec.lower() for sec in parse_section(s_obj_or_dict.exam_section)]
                ss = [sec.lower() for sec in parse_section(s_obj_or_dict.study_section)]
            return se + ss

        # A. Assign Submitted Students
        for sub in all_subs_list:
            assigned = False
            for c in all_target_centres:
                if sub['c_code'] == str(c.code).lower().strip() or sub['c_name'] == str(c.name).lower().strip():
                    # Verification
                    if not allowed_sections_list:
                        is_mismatched = True
                    else:
                        erp_record = erp_index.get(f"email_{str(sub.get('email') or '').lower()}") or \
                                     erp_index.get(f"adm_{str(sub.get('adm') or '').upper()}")
                        sects = _get_student_sections(erp_record, True) if erp_record else []
                        if not sects:
                            u_tmp = CustomUser.objects.filter(pk=sub['pk']).first()
                            sects = _get_student_sections(u_tmp) if u_tmp else []
                        is_mismatched = not any(sec in allowed_sections_list for sec in sects)

                    if not is_mismatched:
                        centre_counts[str(c.pk)]['sub'] += 1
                        centre_counts[str(c.pk)]['roster'] += 1
                    assigned = True; break
            
            if assigned:
                global_seen_uids.add(sub['uid'])
                if sub['adm']: global_seen_uids.add(sub['adm'].upper().strip())
                if sub['email']: global_seen_uids.add(sub['email'].lower().strip())
            else:
                unassigned_sub_count += 1

        # B. Assign Remaining Local Students (SINGLE BATCH LOOKUP to void N+1 issues)
        all_students = CustomUser.objects.filter(user_type='student')
        for s in all_students:
            s_c_code = (s.centre_code or '').lower().strip()
            s_c_name = (s.centre_name or '').lower().strip()
            if not s_c_code and not s_c_name: continue
            
            for c in all_target_centres:
                if s_c_code == str(c.code).lower().strip() or s_c_name == str(c.name).lower().strip():
                    uid = (s.username or str(s.pk)).upper().strip()
                    if uid in global_seen_uids: break
                    if not allowed_sections_list: break
                    
                    erp_rec = erp_index.get(f"email_{str(s.email).lower()}") or erp_index.get(f"adm_{str(s.admission_number).upper()}")
                    sects = _get_student_sections(erp_rec, True) if erp_rec else _get_student_sections(s)
                    if any(sec in allowed_sections_list for sec in sects):
                        centre_counts[str(c.pk)]['roster'] += 1
                        global_seen_uids.add(uid)
                        if s.admission_number: global_seen_uids.add(s.admission_number.upper().strip())
                        if s.email: global_seen_uids.add(s.email.lower().strip())
                    break

        # C. Assign Remaining ERP Students (Using O(1) Index for faster matching)
        # We only iterate over ALL erp students once here, but the checks are now simpler
        erp_pool = erp_index.values() # Unique records from Hash Map
        for erp in erp_pool:
            if not isinstance(erp, dict): continue
            adm = str(erp.get('admissionNumber') or '').upper().strip()
            details = erp.get('student', {}).get('studentsDetails', [{}])[0]
            email = str(details.get('studentEmail') or "").lower().strip()
            
            if (adm and adm in global_seen_uids) or (email and email in global_seen_uids): continue
            if not allowed_sections_list: continue
            
            sects = _get_student_sections(erp, True)
            if not any(sec in allowed_sections_list for sec in sects): continue
            
            e_centre_raw = erp.get('centre') or (erp.get('venue', {}) if isinstance(erp.get('venue'), dict) else {}).get('centreName')
            e_centre = str(e_centre_raw or '').upper().strip()
            if not e_centre: continue
            
            for c in all_target_centres:
                cn = c.name.upper().strip()
                cc = c.code.upper().strip()
                if cn == e_centre or cc == e_centre or cn in e_centre or e_centre in cn:
                    centre_counts[str(c.pk)]['roster'] += 1
                    if adm: global_seen_uids.add(adm)
                    if email: global_seen_uids.add(email)
                    break

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
            serialized['total_students_in_centre'] = centre_counts[c_id]['roster']
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

        # Validation: Ensure student matches the allotted section for this test
        if user.user_type == 'student':
            allowed_sections = [s.name.strip().lower() for s in test.allotted_sections.all()]
            if allowed_sections:
                from api.db_utils import parse_section
                s_exams = [s.lower() for s in parse_section(user.exam_section)]
                s_studies = [s.lower() for s in parse_section(user.study_section)]
                s_all = set(s_exams + s_studies)
                
                # Check if student is in any allowed section
                is_allotted = any(s in allowed_sections for s in s_all)
                
                # If they don't match, block entry UNLESS they already have an existing submission 
                # (to avoid locking out students who might have had their section's name changed)
                if not is_allotted:
                    if not TestSubmission.objects.filter(test=test, student=user).first():
                        return Response({
                            'error': 'This test is not allotted to your section. Please contact your administrator.'
                        }, status=status.HTTP_403_FORBIDDEN)

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
                sub_docs = list(db['tests_testsubmission'].find({'test_id': test.pk}))
                if sub_docs:
                    sub_pks = [d['student_id'] for d in sub_docs]
                    users_map = {str(u.pk): u for u in CustomUser.objects.filter(pk__in=sub_pks)}
                    for sd in sub_docs:
                        sid_str = str(sd['student_id'])
                        u = users_map.get(sid_str)
                        if u:
                            all_subs_list.append({
                                'doc': sd, 'pk': u.pk, 'uid': (u.username or sid_str).upper().strip(),
                                'adm': u.admission_number, 'email': u.email,
                                'c_code': str(u.centre_code or '').lower().strip(),
                                'c_name': str(u.centre_name or '').lower().strip()
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
        allowed_sections_list = [s.name.strip().lower() for s in test.allotted_sections.all()]
        
        # Tracking student submissions (for data enrichment)
        # We also need a fast map for finalized status etc.
        sub_map = {str(s['pk']): s['doc'] for s in all_subs_list}

        # Build ERP index EARLY for O(1) performance
        erp_index = get_student_lookup_index(force_refresh=force_refresh)

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
                is_mismatched = False # Default to visible if we have a submission
                if u_obj and allowed_sections_list:
                    erp_rec = erp_index.get(f"email_{str(u_obj.email).lower()}") or erp_index.get(f"adm_{str(u_obj.admission_number).upper()}")
                    sects = _get_student_sections(erp_rec, True) if erp_rec else _get_student_sections(u_obj)
                    is_mismatched = not any(sec in allowed_sections_list for sec in sects)
                
                global_seen_uids.add(sub['uid'])
                if sub['adm']: global_seen_uids.add(sub['adm'].upper().strip())
                if sub['email']: global_seen_uids.add(sub['email'].lower().strip())
                if not is_mismatched:
                    final_list.append((u_obj, False))

        # Step B: Assign Local Students (Only those belonging to the target centre)
        if target_c_obj:
            pool = CustomUser.objects.filter(user_type='student').filter(
                Q(centre_code__iexact=target_c_obj.code) | Q(centre_name__iexact=target_c_obj.name)
            )
            for s in pool:
                uid = (s.username or str(s.pk)).upper().strip()
                if uid in global_seen_uids: continue
                if not allowed_sections_list: continue
                
                erp_rec = erp_index.get(f"email_{str(s.email).lower()}") or erp_index.get(f"adm_{str(s.admission_number).upper()}")
                sects = _get_student_sections(erp_rec, True) if erp_rec else _get_student_sections(s)
                if any(sec in allowed_sections_list for sec in sects):
                    final_list.append((s, False))
                    global_seen_uids.add(uid)
                    if s.admission_number: global_seen_uids.add(s.admission_number.upper().strip())
                    if s.email: global_seen_uids.add(s.email.lower().strip())

        # Step C: Assign ERP Mock Students (Only those belonging to target centre)
        if target_c_obj:
            tcn = target_c_obj.name.upper().strip()
            tcc = target_c_obj.code.upper().strip()
            
            for erp in erp_index.values():
                adm = str(erp.get('admissionNumber') or '').upper().strip()
                det = erp.get('student', {}).get('studentsDetails', [{}])[0]
                em = str(det.get('studentEmail') or "").lower().strip()
                
                # Check for existing local student or already processed ERP student
                if (adm and adm in global_seen_uids) or (em and em in global_seen_uids): continue
                if not allowed_sections_list: continue
                
                # 1. Section Matching (Must match one of the test's allotted sections)
                sects = _get_student_sections(erp, True)
                if not any(sec in allowed_sections_list for sec in (sects or [])): continue
                
                # 2. Centre Matching
                ecr = erp.get('centre') or (erp.get('venue', {}) if isinstance(erp.get('venue'), dict) else {}).get('centreName')
                ec = str(ecr or '').upper().strip()
                
                if ec == tcn or ec == tcc or tcn in ec or ec in tcn:
                    sn = str(det.get('studentName') or 'Student').strip()
                    sp = sn.split(' ')
                    final_list.append((SimpleNamespace(
                        pk=None, username=adm, email=em or f"{adm.lower()}@unknown.com",
                        first_name=sp[0], last_name=' '.join(sp[1:]) if len(sp) > 1 else '',
                        admission_number=adm, exam_section=erp.get('sectionAllotment', {}).get('examSection'),
                        study_section=erp.get('sectionAllotment', {}).get('studySection'),
                        rm_code=None, omr_code=None, employee_id=None, user_type='student'
                    ), False))
                    if adm: global_seen_uids.add(adm)
                    if em: global_seen_uids.add(em)

        # 5. Format and Enrich Final Response
        data = []
        for item in final_list:
            s, is_mis = item if isinstance(item, tuple) else (item, False)
            if not s: continue
            
            uid_str = str(s.pk) if s.pk else None
            sub = sub_map.get(uid_str) if uid_str else None
            
            # Use Index for enrichment (FAST)
            erp_data = erp_index.get(f"email_{str(s.email).lower()}") or erp_index.get(f"adm_{str(s.username).upper()}")
            
            enroll = str(erp_data.get('admissionNumber') if erp_data else (s.admission_number or 'ID MISSING')).upper().strip()
            section = str((erp_data.get('sectionAllotment', {}).get('examSection') if erp_data and isinstance(erp_data.get('sectionAllotment'), dict) else s.exam_section) or '—').upper().strip()
            
            data.append({
                'id': str(sub['_id']) if sub else None,
                'student_id': uid_str,
                'student_name': (f"{s.first_name} {s.last_name}".strip() or s.username).upper(),
                'username': s.username, 'email': s.email, 'enroll_number': enroll, 'section': section,
                'score': sub.get('score') if sub else None,
                'submission_type': sub.get('submission_type') if sub else None,
                'time_spent': sub.get('time_spent', 0) if sub else 0,
                'submitted_at': sub.get('submitted_at').isoformat() if sub and hasattr(sub.get('submitted_at'), 'isoformat') else None,
                'status': 'Submitted' if sub and sub.get('is_finalized') else ('In Progress' if sub else 'Available'),
                'allow_resume': sub.get('allow_resume', False) if sub else False,
                'is_finalized': sub.get('is_finalized', False) if sub else False
            })

        cache_key = f'roster_count_{test.pk}_{centre_code}'
        cache.set(cache_key, len(data), 600)
        return Response({'allotted_sections': list(test.allotted_sections.values_list('name', flat=True)), 'data': data})

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
        
        return Response({
            'message': 'Test results forcefully published successfully.',
            'is_completed': True,
            'is_result_published': True
        })

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

        for section in test.sections.all().order_by('priority'):
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
                        ans_str = str(answer)
                        is_correct = False
                        
                        # Direct match
                        if ans_str in q_data['correct_options']:
                            is_correct = True
                        else:
                            # Handle A/B/C/D mapping to 1/2/3/4/etc based on index or mapping
                            mapping = {'A': '1', 'B': '2', 'C': '3', 'D': '4'}
                            if ans_str in mapping and mapping[ans_str] in q_data['correct_options']:
                                is_correct = True
                            
                            # Handle if answer string matches the content of the correct option (rare but happens)
                            if not is_correct:
                                for opt in q_data['options']:
                                    opt_id = str(opt.get('id', ''))
                                    if opt_id in q_data['correct_options'] and (ans_str == opt_id or ans_str == opt.get('content')):
                                        is_correct = True
                                        break
                                        
                        if is_correct:
                            q_data['correct'] += 1
                        else:
                            q_data['incorrect'] += 1
                    elif q_type == 'MULTI_CHOICE':
                        selected = set(map(str, answer if isinstance(answer, list) else [answer]))
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
        for section in test.sections.all().order_by('priority'):
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
        # Use fresh query instead of prefetch to avoid caching/limit issues
        sections = list(Section.objects.filter(allotted_tests=test).order_by('priority'))
        # Build flat q_map and accumulation of max marks
        q_map = {} 
        sections_max = {}
        for sec in sections:
            if sec.name not in sections_max:
                sections_max[sec.name] = 0
            
            c_marks = float(sec.correct_marks or 0)
            seen_q_local = set()
            
            for q in sec.questions.all():
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
        s_objs = CustomUser.objects.filter(pk__in=student_ids).values('pk', 'first_name', 'last_name', 'username', 'admission_number', 'centre_name')
        s_lookup = {}
        for s in s_objs:
            s_lookup[str(s['pk'])] = s

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
                
                # Fetch questions for this specific section allotment
                seen_in_sec = set()
                for q in sec.questions.all():
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
                    
                    if q_type == 'SINGLE_CHOICE':
                        ans_str = str(ans).strip().lower()
                        clean_ans = clean_html(ans)
                        is_correct = False
                        
                        opts = q.question_options or []
                        for oi, opt in enumerate(opts):
                            opt_id = str(opt.get('id', ''))
                            opt_content = clean_html(opt.get('content') or opt.get('text', ''))
                            opt_label = keys[oi] if oi < len(keys) else None
                            if ans_str == opt_id or clean_ans == opt_content or (opt_label and ans_str == opt_label):
                                if opt.get('isCorrect'): is_correct = True
                                break
                        if not is_correct:
                            try:
                                idx = int(ans_str)
                                if idx < len(opts) and opts[idx].get('isCorrect'): is_correct = True
                            except: pass
                        
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

            result_data.append({
                'name': (f"{s_info.get('first_name','')} {s_info.get('last_name','')}".strip() or s_info.get('username','Unknown')).upper(),
                'enrollment': s_info.get('admission_number') or s_info.get('username') or 'N/A',
                'centre': s_info.get('centre_name') or 'N/A',
                'marks': round(total_recalculated, 2),
                'accuracy': f"{round(accuracy, 2)}%",
                'totalTime': time_str,
                'time_spent_raw': ts,
                'submitted_at': sub.get('submitted_at') or sub.get('_id'),
                'section_scores': {k: f"{round(v, 2)}/{int(sections_max[k]) if sections_max[k].is_integer() else sections_max[k]}" for k, v in section_scores.items()},
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
        sections = list(test.sections.all().order_by('priority'))
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
                    if qtype == 'SINGLE_CHOICE':
                        ans_str = str(ans).strip().lower()
                        clean_ans = clean_html(ans)
                        
                        is_correct = False
                        # Scan all options for a match (ID, Content, Label, or Index)
                        keys = ['a', 'b', 'c', 'd', 'e', 'f']
                        for oi, opt in enumerate(qi.get('options', [])):
                            opt_id = str(opt.get('id', ''))
                            opt_content = clean_html(opt.get('content') or opt.get('text', ''))
                            opt_label = keys[oi] if oi < len(keys) else None
                            
                            if ans_str == opt_id or clean_ans == opt_content or (opt_label and ans_str == opt_label):
                                if opt.get('isCorrect'):
                                    is_correct = True
                                break

                        if not is_correct:
                            try:
                                idx = int(ans_str)
                                if idx < len(qi['options']) and qi['options'][idx].get('isCorrect'):
                                    is_correct = True
                            except: pass

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
                            # Find matching option
                            for oi, opt in enumerate(qi.get('options', [])):
                                opt_id = str(opt.get('id', ''))
                                opt_content = clean_html(opt.get('content') or opt.get('text', ''))
                                opt_label = keys[oi] if oi < len(keys) else None
                                if item_str == opt_id or item_str == opt_content or (opt_label and item_str == opt_label):
                                    normalized_selected.add(opt_id)
                                    break
                                    
                        correct = set(qi['correct_options'])
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

                section_question_map[sec['name']].append({
                    'id': qid,
                    'content': qi['content'],
                    'solution': qi['solution'],
                    'type': qi['type'],
                    'correct_marks': qi['correct_marks'],
                    'negative_marks': qi['negative_marks'],
                    'options': qi['options'],
                    'correct_options': qi['correct_options'],
                    'user_answer': user_answer,
                    'result': q_result,
                    'earned': round(earned - neg, 2),
                    'time_spent': q_time
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
                            if q_type == 'SINGLE_CHOICE':
                                ans_str = str(ans).strip().lower()
                                clean_ans = clean_html(ans)
                                is_correct = False
                                keys = ['a', 'b', 'c', 'd', 'e', 'f']
                                for oi, opt in enumerate(q_info.get('options', [])):
                                    opt_id = str(opt.get('id', ''))
                                    opt_content = clean_html(opt.get('content') or opt.get('text', ''))
                                    opt_label = keys[oi] if oi < len(keys) else None
                                    if ans_str == opt_id or clean_ans == opt_content or (opt_label and ans_str == opt_label):
                                        if opt.get('isCorrect'): is_correct = True
                                        break
                                if not is_correct:
                                    try:
                                        idx = int(ans_str)
                                        if idx < len(q_info.get('options', [])) and q_info['options'][idx].get('isCorrect'): is_correct = True
                                    except: pass
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
                                if normalized_selected == correct: earned = q_info['correct_marks']
                                elif normalized_selected & correct:
                                    fraction = len(normalized_selected & correct) / len(correct) if correct else 0
                                    earned = round(q_info['correct_marks'] * fraction, 2)
                                else: neg = q_info['negative_marks']
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
        cached_data = cache.get(cache_key)
        
        if cached_data:
            return Response(cached_data)

        try:
            test = Test.objects.get(pk=pk)
        except Test.DoesNotExist:
            return Response({'detail': 'Test not found'}, status=status.HTTP_404_NOT_FOUND)
            
        # Order by priority
        sections = test.sections.all().order_by('priority')
        
        sections_data = []
        from sections.serializers import SectionSerializer
        from questions.serializers import QuestionSerializer
        
        for section in sections:
            section_dict = SectionSerializer(section).data
            # Fetch detailed questions and deduplicate/sort them
            seen_pks = set()
            unique_qs_list = []
            for q in section.questions.all():
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
            'sections': sections_data
        }
        
        # Cache for 60 minutes
        cache.set(cache_key, response_data, timeout=3600)
        # Forced reload marker to clear LocMemCache in dev server
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
            target_exam=source_test.target_exam,
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
        
        # Set the section
        new_test.allotted_sections.set([target_section])
        
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
        for section in test.sections.all():
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
            
            # SCORING LOGIC
            is_correct = False
            
            if q_obj.question_type in ['SINGLE_CHOICE', 'MULTI_CHOICE']:
                if q_obj.question_type == 'SINGLE_CHOICE':
                    ans_str = str(received_answer).strip().lower()
                    clean_ans = clean_html(received_answer)
                    keys = ['a', 'b', 'c', 'd', 'e', 'f']
                    for oi, opt in enumerate(q_obj.question_options or []):
                        opt_id = str(opt.get('id', ''))
                        opt_content = clean_html(opt.get('content') or opt.get('text', ''))
                        opt_label = keys[oi] if oi < len(keys) else None
                        if ans_str == opt_id or clean_ans == opt_content or (opt_label and ans_str == opt_label):
                            if opt.get('isCorrect'): is_correct = True
                            break
                    if not is_correct:
                        try:
                            idx = int(ans_str)
                            opts = q_obj.question_options or []
                            if idx < len(opts) and opts[idx].get('isCorrect'): is_correct = True
                        except: pass
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
            student_pks = list(student_data.keys())
            users = CustomUser.objects.filter(pk__in=student_pks).only(
                'id', 'first_name', 'last_name', 'username', 'admission_number'
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

        return Response({
            'tests': [{'id': str(t.pk), 'name': t.name, 'code': t.code} for t in tests_list],
            'leaderboard': leaderboard
        })


    @action(detail=False, methods=['get'])
    def my_results(self, request):
        user = request.user
        if not user or user.is_anonymous:
            return Response({'error': 'Unauthorized'}, status=401)
            
        from api.db_utils import get_db
        db = get_db()
        if db is None:
            return Response([])
            
        # Get all published tests with sections to compute max marks efficiently if 0
        published_tests = Test.objects.filter(is_result_published=True).prefetch_related('sections')
        tests_map = {}
        for t in published_tests:
            if t.total_marks == 0:
                calc_total = 0
                for sec in t.sections.all():
                    unique_q_count = len(set(q.pk for q in sec.questions.all()))
                    calc_total += unique_q_count * float(sec.correct_marks or 0)
                t.total_marks = int(calc_total)
            tests_map[str(t.pk)] = t
        
        # Prepare test_id array for Mongo matching
        from bson import ObjectId
        mongo_test_ids = []
        for t in published_tests:
            try: mongo_test_ids.append(ObjectId(t.pk))
            except: mongo_test_ids.append(t.pk)
            # also append int version just in case
            try: mongo_test_ids.append(int(t.pk))
            except: pass
            
        if not mongo_test_ids:
            return Response([])
            
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
                    'submitted_at': sub.get('submitted_at')
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
            
            results.append({
                'id': tid,
                'name': test.name,
                'code': test.code,
                'date': date_str,
                'marks': round(u_data['score'], 2),
                'total': test.total_marks,
                'rank': rank,
                'percentile': percentile
            })
            
        results.sort(key=lambda x: x['date'], reverse=True)
        return Response(results)


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
