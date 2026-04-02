from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
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

class TestViewSet(viewsets.ModelViewSet):
    lookup_field = 'pk'
    serializer_class = TestSerializer

    def get_queryset(self):
        user = self.request.user
        # Djongo handles select_related poorly (nested $lookups) compared to prefetch_related (simple $in queries).
        # We prefetch everything to keep the query time under ~50ms for the entire tests list.
        queryset = Test.objects.all().prefetch_related(
            'session', 'target_exam', 'exam_type', 'exam_type__target_exams', 'class_level', 'package',
            'allotted_sections', 'centres', 'sections', 'centre_allotments'
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
                if not t_sections or any(sec in student_sections for sec in t_sections):
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
        # Clear admin test list cache
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
        cache.delete(f"test_paper_{instance.pk}") # Clear the exam paper cache too if test details changed
        
        # Get current allowed centres - safer fetching for Djongo/Mongo
        centres = list(instance.centres.all())
        current_centre_ids = [str(c.pk) for c in centres]
        
        # Sync allotments: find existing and delete what's no longer present
        existing_allotments = TestCentreAllotment.objects.filter(test=instance)
        
        # Delete stale allotments (those no longer in the centres list)
        for allotment in existing_allotments:
            if str(allotment.centre_id) not in current_centre_ids:
                allotment.delete()

        # Create missing allotments for newly added centres
        for centre in centres:
            TestCentreAllotment.objects.get_or_create(test=instance, centre=centre)

    def list(self, request, *args, **kwargs):
        # Cache the test list for staff users (admin panel) to avoid heavy student count queries
        from django.core.cache import cache
        from api.erp_views import get_student_lookup_index
        is_staff = request.user.is_staff or request.user.is_superuser
        force_refresh = request.query_params.get('refresh', 'false').lower() == 'true'
        
        if is_staff and force_refresh:
            # Global purge of ERP student cache and index
            cache.delete("admin_test_list")
            get_student_lookup_index(force_refresh=True)

        if is_staff and not force_refresh:
            cache_key = "admin_test_list"
            cached_data = cache.get(cache_key)
            if cached_data:
                return Response(cached_data)
        
        response = super().list(request, *args, **kwargs)
        
        if is_staff:
            # Cache for a short time to keep it fresh but fast
            cache.set("admin_test_list", response.data, 60)
            
        return response

    def destroy(self, request, *args, **kwargs):
        from django.core.cache import cache
        cache.delete("admin_test_list")
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['get'])
    def sections(self, request, pk=None):
        try:
            test = Test.objects.get(pk=pk)
        except Test.DoesNotExist:
            return Response({'detail': 'Test not found'}, status=status.HTTP_404_NOT_FOUND)
        sections = test.allotted_sections.all()
        serializer = SectionSerializer(sections, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def centres(self, request, pk=None):
        try:
            # Use direct model lookup to bypass potentially restrictive get_queryset
            test = Test.objects.get(pk=pk)
        except Test.DoesNotExist:
            return Response({'detail': 'Test not found'}, status=status.HTTP_404_NOT_FOUND)
            
        from api.models import CustomUser
        from .models import TestSubmission
        from centres.models import Centre
        from api.db_utils import get_db, parse_section
        from django.core.cache import cache
        from api.erp_views import _fetch_all_students_erp # Import helper
        force_refresh = request.query_params.get('refresh', 'false').lower() == 'true'
        
        db = get_db()
        
        # 1. Fetch ALL allotted allotments
        all_allotments = list(test.centre_allotments.all().select_related('centre'))
        allotted_centres_map = {str(a.centre_id): a for a in all_allotments}
        allotted_centre_ids = list(allotted_centres_map.keys())
        
        # 2. Pre-fetch ALL submissions for this test
        all_subs_list = []
        sub_docs = []
        if db is not None:
            try:
                sub_docs = list(db['tests_testsubmission'].find({'test_id': test.pk}, {'student_id': 1}))
                if sub_docs:
                    student_pks = [d['student_id'] for d in sub_docs]
                    # Fetch student centre info and names for de-duplication
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

        # 3. Identify Extra Centres (not allotted but have submissions)
        extra_centres = []
        if all_subs_list:
            sub_c_codes = {d['c_code'] for d in all_subs_list if d['c_code']}
            sub_c_names = {d['c_name'] for d in all_subs_list if d['c_name']}
            if sub_c_codes or sub_c_names:
                extra_centres = list(Centre.objects.filter(
                    Q(code__in=sub_c_codes) | Q(name__in=sub_c_names)
                ).exclude(pk__in=allotted_centre_ids))

        # 4. Process all students and map to exactly ONE centre (prioritize allotted)
        all_target_centres = [a.centre for a in all_allotments] + extra_centres
        centre_counts = {str(c.pk): {'sub': 0, 'roster': 0} for c in all_target_centres}
        
        global_seen_uids = set()
        unassigned_sub_count = 0
        allowed_sections_list = [s.name.strip().lower() for s in test.allotted_sections.all()]

        # A. Assign Submitted Students (Baseline)
        for sub in all_subs_list:
            assigned = False
            for c in all_target_centres:
                if sub['c_code'] == str(c.code).lower().strip() or sub['c_name'] == str(c.name).lower().strip():
                    centre_counts[str(c.pk)]['sub'] += 1
                    centre_counts[str(c.pk)]['roster'] += 1
                    assigned = True
                    break
            
            if assigned:
                global_seen_uids.add(sub['uid'])
                if sub['adm']: global_seen_uids.add(sub['adm'].upper().strip())
                if sub['email']: global_seen_uids.add(sub['email'].lower().strip())
            else:
                unassigned_sub_count += 1

        # B. Assign Remaining Local Students (Strict Priority)
        for c in all_target_centres:
            c_code = str(c.code).lower().strip()
            c_name = str(c.name).lower().strip()
            
            pool = CustomUser.objects.filter(user_type='student').filter(
                Q(centre_code__iexact=c_code) | Q(centre_name__iexact=c_name)
            )
            for s in pool:
                uid = (s.username or str(s.pk)).upper().strip()
                if uid in global_seen_uids: continue
                
                if allowed_sections_list:
                    s_exams = [sec.lower() for sec in parse_section(s.exam_section)]
                    s_studies = [sec.lower() for sec in parse_section(s.study_section)]
                    if not any(sec in allowed_sections_list for sec in (s_exams + s_studies)):
                        continue
                
                centre_counts[str(c.pk)]['roster'] += 1
                global_seen_uids.add(uid)
                if s.admission_number: global_seen_uids.add(s.admission_number.upper().strip())
                if s.email: global_seen_uids.add(s.email.lower().strip())

        # C. Assign Remaining ERP Students (Fuzzy Match but deduplicated)
        erp_pool = _fetch_all_students_erp(force_refresh=force_refresh)
        for erp in erp_pool:
            e_adm = str(erp.get('admissionNumber') or '').upper().strip()
            e_email = str(erp.get('student', {}).get('studentsDetails', [{}])[0].get('studentEmail') or "").lower().strip()
            if (e_adm and e_adm in global_seen_uids) or (e_email and e_email in global_seen_uids):
                continue
                
            e_centre = str(erp.get('centre') or '').upper().strip()
            if not e_centre: continue
            
            for c in all_target_centres:
                c_name_up = c.name.upper()
                c_code_up = c.code.upper()
                if c_name_up in e_centre or e_centre in c_name_up or c_code_up == e_centre:
                    if allowed_sections_list:
                        sec_allot = erp.get('sectionAllotment', {})
                        e_exams = [sec.lower() for sec in parse_section(sec_allot.get('examSection'))]
                        e_studies = [sec.lower() for sec in parse_section(sec_allot.get('studySection'))]
                        if not any(sec in allowed_sections_list for sec in (e_exams + e_studies)):
                            continue
                    
                    centre_counts[str(c.pk)]['roster'] += 1
                    if e_adm: global_seen_uids.add(e_adm)
                    if e_email: global_seen_uids.add(e_email)
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
                    if not TestSubmission.objects.filter(test=test, student=user).exists():
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

        # Step A: Assigned Submitted Students
        for sub in all_subs_list:
            assigned_c_pk = None
            for c in all_target_centres:
                if sub['c_code'] == str(c.code).lower().strip() or sub['c_name'] == str(c.name).lower().strip():
                    assigned_c_pk = str(c.pk)
                    break
            
            captured_for_this_request = False
            if assigned_c_pk:
                if target_c_obj and assigned_c_pk == str(target_c_obj.pk):
                    captured_for_this_request = True
                global_seen_uids.add(sub['uid'])
                if sub['adm']: global_seen_uids.add(sub['adm'].upper().strip())
                if sub['email']: global_seen_uids.add(sub['email'].lower().strip())
            else:
                if centre_code == 'N/A':
                    captured_for_this_request = True
            
            if captured_for_this_request:
                final_list.append(users_map.get(str(sub['pk'])))

        # Step B: Assign Local Students
        for c in all_target_centres:
            pool = CustomUser.objects.filter(user_type='student').filter(
                Q(centre_code__iexact=c.code) | Q(centre_name__iexact=c.name)
            )
            for s in pool:
                uid = (s.username or str(s.pk)).upper().strip()
                if uid in global_seen_uids: continue
                
                adm = (s.admission_number or '').upper().strip()
                email = (s.email or '').lower().strip()
                if (adm and adm in global_seen_uids) or (email and email in global_seen_uids): continue
                
                if allowed_sections_list:
                    se = [sec.lower() for sec in parse_section(s.exam_section)]
                    ss = [sec.lower() for sec in parse_section(s.study_section)]
                    if not any(sec in allowed_sections_list for sec in (se + ss)):
                        continue
                
                if target_c_obj and str(c.pk) == str(target_c_obj.pk):
                    final_list.append(s)
                
                global_seen_uids.add(uid)
                if adm: global_seen_uids.add(adm)
                if email: global_seen_uids.add(email)

        # Step C: Assign ERP Mock Students
        erp_pool = cache.get('erp_all_students_v1') or []
        for erp in erp_pool:
            e_adm = str(erp.get('admissionNumber') or '').upper().strip()
            e_email = str(erp.get('student', {}).get('studentsDetails', [{}])[0].get('studentEmail') or "").lower().strip()
            if (e_adm and e_adm in global_seen_uids) or (e_email and e_email in global_seen_uids): continue
            
            e_centre = str(erp.get('centre') or '').upper().strip()
            if not e_centre: continue
            
            assigned_c_pk = None
            for c in all_target_centres:
                cnu = c.name.upper()
                ccu = c.code.upper()
                if cnu in e_centre or e_centre in cnu or ccu == e_centre:
                    if allowed_sections_list:
                        sa = erp.get('sectionAllotment', {})
                        ee = [sec.lower() for sec in parse_section(sa.get('examSection'))]
                        st = [sec.lower() for sec in parse_section(sa.get('studySection'))]
                        if not any(sec in allowed_sections_list for sec in (ee + st)):
                            continue
                    
                    assigned_c_pk = str(c.pk)
                    break
            
            if assigned_c_pk:
                if target_c_obj and assigned_c_pk == str(target_c_obj.pk):
                    # Create mock profile
                    details = erp.get('student', {}).get('studentsDetails', [{}])[0]
                    sn = str(details.get('studentName') or 'Student').strip()
                    sp = sn.split(' ')
                    final_list.append(SimpleNamespace(
                        pk=None, username=e_adm, email=e_email or f"{e_adm.lower()}@unknown.com",
                        first_name=sp[0], last_name=' '.join(sp[1:]) if len(sp) > 1 else '',
                        admission_number=e_adm, exam_section=erp.get('sectionAllotment', {}).get('examSection'),
                        study_section=erp.get('sectionAllotment', {}).get('studySection'),
                        rm_code=None, omr_code=None, employee_id=None, user_type='student'
                    ))
                global_seen_uids.add(e_adm)
                if e_email: global_seen_uids.add(e_email)

        # 5. Format and Enrich Final Response
        erp_index = get_student_lookup_index(force_refresh=force_refresh)
        data = []
        for s in final_list:
            uid_str = str(s.pk) if s.pk else None
            # Need to get actual submission doc (from Mongo or Django)
            # sub_map uses pk as string
            sub = sub_map.get(uid_str) if uid_str else None
            
            search_email = str(s.email or "").strip().lower()
            u_clean = str(s.username or "").strip()
            erp_data = None
            if erp_index:
                erp_data = erp_index.get(f"email_{search_email}") or \
                           erp_index.get(f"adm_{u_clean.upper()}") or \
                           erp_index.get(f"adm_{u_clean.lower()}")
            
            lib_adm = erp_data.get('admissionNumber') if erp_data else None
            lib_sec = erp_data.get('sectionAllotment', {}).get('examSection') if erp_data and isinstance(erp_data.get('sectionAllotment'), dict) else None
            lib_rm = erp_data.get('sectionAllotment', {}).get('rm') if erp_data and isinstance(erp_data.get('sectionAllotment'), dict) else None
            
            enr_raw = lib_adm or s.admission_number or getattr(s, 'rm_code', None) or getattr(s, 'omr_code', None) or lib_rm or getattr(s, 'employee_id', None) or ''
            if isinstance(enr_raw, list):
                enr_raw = "".join(map(str, enr_raw))
            enroll = str(enr_raw).upper().strip()
            if not enroll or '@' in enroll: enroll = 'ID MISSING'
            
            sec_raw = lib_sec or s.exam_section or '—'
            if isinstance(sec_raw, list):
                sec_raw = ", ".join(map(str, sec_raw))
            section = str(sec_raw).upper().strip()
            
            sub_doc = sub # This is from sub_map (the mongo doc)
            from rest_framework import status
            
            data.append({
                'id': str(sub_doc['_id']) if sub_doc else None,
                'student_id': uid_str,
                'student_name': (f"{s.first_name} {s.last_name}".strip() or s.username).upper(),
                'username': s.username,
                'email': s.email,
                'enroll_number': enroll,
                'section': section,
                'score': sub_doc.get('score') if sub_doc else None,
                'submission_type': sub_doc.get('submission_type') if sub_doc else None,
                'time_spent': sub_doc.get('time_spent', 0) if sub_doc else 0,
                'submitted_at': sub_doc.get('submitted_at').isoformat() if sub_doc and hasattr(sub_doc.get('submitted_at'), 'isoformat') else None,
                'status': 'Submitted' if sub_doc and sub_doc.get('is_finalized') else ('In Progress' if sub_doc else 'Available'),
                'allow_resume': sub_doc.get('allow_resume', False) if sub_doc else False,
                'is_finalized': sub_doc.get('is_finalized', False) if sub_doc else False
            })

        # Consistency Cache (Update global roster cache for this centre)
        cache_key = f'roster_count_{test.pk}_{centre_code}'
        cache.set(cache_key, len(data), 600)

        return Response({
            'allotted_sections': list(test.allotted_sections.values_list('name', flat=True)),
            'data': data
        })

    @action(detail=True, methods=['post'], url_path='generate_result')
    def generate_result(self, request, pk=None):
        test = self.get_object()
        # A test can only have its results generated if it's over for all centres (for global results)
        # However, for manual trigger, we can allow it if the user is staff.
        from django.utils import timezone
        now = timezone.now()
        is_over = all(a.end_time and a.end_time < now for a in test.centre_allotments.all())
        
        # User explicitly asked to enforce "only after over"
        if not is_over:
            return Response({'error': 'Results can only be generated after the exam is over for all allotted centres.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # TODO: Implement actual scoring/ranking logic here if not already done via submissions
        # Currently, TestSubmission usually calculates score on save.
        
        # Mark the test as completed
        test.is_completed = True
        test.save()
        
        return Response({'message': 'Results generated and test marked as completed successfully.'})

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

        for section in test.allotted_sections.all().order_by('priority'):
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
                        if str(answer) in q_data['correct_options']:
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
        for section in test.allotted_sections.all().order_by('priority'):
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
                        status = 'CA' if str(ans) in q['correct_options'] else 'IA'
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
            return Response({'error': 'enrollment param is required'}, status=status.HTTP_400_BAD_REQUEST)

        test = self.get_object()

        # 1. Resolve student
        student_obj = CustomUser.objects.filter(admission_number__iexact=enrollment).first() \
                   or CustomUser.objects.filter(username__iexact=enrollment).first()

        # 2. Load all sections + questions once
        sections = list(test.allotted_sections.all().order_by('priority'))
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
            return Response({'error': 'No finalized submission found for this student.'}, status=status.HTTP_404_NOT_FOUND)

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
                    'earned': round(earned - neg, 2)
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
                    for q_id, q_info in q_map.items():
                        res_obj = responses.get(str(q_id))
                        if res_obj is None:
                            try: res_obj = responses.get(int(q_id))
                            except: pass
                        
                        ans = res_obj.get('answer') if isinstance(res_obj, dict) else res_obj
                        if ans in (None, '', [], {}): continue
                        
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
                    
                    scored_docs.append({
                        '_id': doc['_id'],
                        'score': round(s_score, 2),
                        'time_spent': int(doc.get('time_spent', 0)),
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

        top_accuracy = 100  # Default topper accuracy placeholder
        average_accuracy = 50 # Default average accuracy placeholder
        # In a real system, you'd calculate these by querying all submissions' accuracy
        # but let's at least provide something more than hardcoded frontend constants.

        return Response({
            'student_name': student_obj.get_full_name().upper() if student_obj else enrollment.upper(),
            'enrollment': enrollment.upper(),
            'score': total_score,
            'rank': rank,
            'top_score': top_score,
            'average_score': average_score,
            'total_students': len(all_scores),
            'percentage': percentage,
            'percentile': percentile,
            'accuracy': accuracy,
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
                    'positive_marks': round(section_stats[sec['name']]['positive_marks'], 2),
                    'negative_marks': round(section_stats[sec['name']]['negative_marks'], 2),
                    'net_marks': round(section_stats[sec['name']]['net_marks'], 2),
                    'total_max': section_stats[sec['name']]['total_max'],
                }
                for sec in sections_meta
            ],
            'section_questions': section_question_map,  # {section_name: [questions...]}
            'all_section_names': [s['name'] for s in sections_meta],
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
        sections = test.allotted_sections.all().order_by('priority')
        
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
        
        # Resolve all questions in this test's allotted sections to correctly map marks
        questions_map = {}
        for section in test.allotted_sections.all():
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
                # For MCQ, correct options are in question_options list
                correct_options = [str(opt['id']) for opt in q_obj.question_options if opt.get('isCorrect')]
                if q_obj.question_type == 'SINGLE_CHOICE':
                    is_correct = str(received_answer) in correct_options
                else:
                    # Multi choice: needs exact match or partial (simplifying for now)
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

        test_ids_raw = request.data.get('test_ids', [])
        if len(test_ids_raw) < 2:
            return Response({'error': 'Please select at least 2 tests to merge.'}, status=status.HTTP_400_BAD_REQUEST)

        # Resolve tests
        tests_qs = Test.objects.filter(pk__in=test_ids_raw).prefetch_related('allotted_sections')
        tests_list = list(tests_qs)
        if len(tests_list) < 2:
            return Response({'error': 'Could not find the selected tests.'}, status=status.HTTP_404_NOT_FOUND)

        test_map = {str(t.pk): t for t in tests_list}

        db = get_db()
        if db is None:
            return Response({'error': 'Database unavailable.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        # student_data: { student_id_str: { 'name': ..., 'enroll': ..., 'papers': { test_id_str: score }, 'total': float } }
        student_data = {}

        for test in tests_list:
            test_id_str = str(test.pk)
            try:
                # Convert pk – may be ObjectId or int depending on Djongo version
                try:
                    t_pk = ObjectId(test.pk)
                except Exception:
                    t_pk = test.pk

                sub_docs = list(db['tests_testsubmission'].find(
                    {'test_id': t_pk, 'is_finalized': True},
                    {'student_id': 1, 'score': 1}
                ))
            except Exception as e:
                print(f"[merge_results] PyMongo error for test {test_id_str}: {e}")
                sub_docs = []

            for doc in sub_docs:
                sid = str(doc.get('student_id'))
                score = float(doc.get('score') or 0)

                if sid not in student_data:
                    student_data[sid] = {'papers': {}, 'total': 0.0, 'name': '', 'username': '', 'enroll': ''}

                student_data[sid]['papers'][test_id_str] = score
                student_data[sid]['total'] += score

        if not student_data:
            return Response({'leaderboard': [], 'tests': [{'id': str(t.pk), 'name': t.name, 'code': t.code} for t in tests_list]})

        # Enrich with student profiles
        try:
            student_pks = list(student_data.keys())
            users = CustomUser.objects.filter(pk__in=student_pks)
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
