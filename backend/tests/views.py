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
        is_staff = request.user.is_staff or request.user.is_superuser
        force_refresh = request.query_params.get('refresh', 'false').lower() == 'true'
        
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
            
        # SELF-HEAL: Ensure Allotment records exist for all selected centres
        local_centres = list(test.centres.all())
        allotments = list(test.centre_allotments.all())
        allotted_centre_ids = [str(a.centre_id) for a in allotments]
        
        for centre in local_centres:
            if str(centre.pk) not in allotted_centre_ids:
                TestCentreAllotment.objects.get_or_create(test=test, centre=centre)
                
        # Re-fetch fresh list
        from api.models import CustomUser
        from .models import TestSubmission
        
        all_allotments = test.centre_allotments.all()
        
        # Pre-fetch all student IDs who have submitted for this test
        all_submitted_student_ids = set(TestSubmission.objects.filter(test=test).values_list('student_id', flat=True))
        
        data = []
        for allotment in all_allotments:
            c_code = allotment.centre.code
            c_name = allotment.centre.name
            from django.db.models import Q
            
            # Count unique attempted students for this centre
            # Djongo workaround: fetch list then use set() to bypass SQL parser crash
            # This counts students who have submitted AND belong to this centre
            submitted_students_in_centre_ids = TestSubmission.objects.filter(test=test).filter(
                Q(student__centre_code__iexact=c_code) | Q(student__centre_name__iexact=c_name)
            ).values_list('student', flat=True)
            submission_count = len(set(submitted_students_in_centre_ids))
            
            # Identify allowed section names for this test for precise counting (lower case for robust matching)
            allowed_sections_list = [s.name.strip().lower() for s in test.allotted_sections.all()]
            
            # Filtered Rooster Count (Matches the logic in 'submissions' view)
            allowed_sections_list = [s.name.strip().lower() for s in test.allotted_sections.all()]
            
            # A. Count local students who match centre and (section OR has submission)
            centre_query = Q(centre_code__iexact=c_code) | Q(centre_name__iexact=c_name)
            centre_pool = CustomUser.objects.filter(user_type='student').filter(centre_query)
            
            from django.core.cache import cache
            from api.db_utils import parse_section
            
            ROSTER_CACHE_TTL = 600  # 10 minutes
            roster_cache_key = f'roster_count_{test.pk}_{c_code}'
            cached_count = cache.get(roster_cache_key)
            
            if cached_count is not None:
                # Use cached value from the authoritative /submissions/ endpoint
                active_roster_count = cached_count
            else:
                # Compute fresh
                active_roster_count = 0
                seen_local_identifiers = set()

                for student in centre_pool:
                    if student.username: seen_local_identifiers.add(student.username.upper().strip())
                    if student.admission_number: seen_local_identifiers.add(student.admission_number.upper().strip())
                    if student.email: seen_local_identifiers.add(student.email.lower().strip())

                    if str(student.pk) in all_submitted_student_ids:
                        active_roster_count += 1
                        continue
                    
                    if allowed_sections_list:
                        s_exams = [s.lower() for s in parse_section(student.exam_section)]
                        s_studies = [s.lower() for s in parse_section(student.study_section)]
                        if not any(sec in allowed_sections_list for sec in (s_exams + s_studies)):
                            continue
                    
                    active_roster_count += 1

                erp_pool = cache.get('erp_all_students_v1') or []
                for erp_student in erp_pool:
                    e_centre = str(erp_student.get('centre') or '').upper().strip()
                    if not e_centre or (c_name.upper() not in e_centre and e_centre not in c_name.upper()):
                        continue
                    
                    if allowed_sections_list:
                        sec_allot = erp_student.get('sectionAllotment', {})
                        e_exams = [s.lower() for s in parse_section(sec_allot.get('examSection'))]
                        e_studies = [s.lower() for s in parse_section(sec_allot.get('studySection'))]
                        if not any(sec in allowed_sections_list for sec in (e_exams + e_studies)):
                            continue
                    
                    e_adm = str(erp_student.get('admissionNumber') or '').upper().strip()
                    e_email = str(erp_student.get('student', {}).get('studentsDetails', [{}])[0].get('studentEmail') or "").lower().strip()
                    if (e_adm and e_adm in seen_local_identifiers) or (e_email and e_email in seen_local_identifiers):
                        continue
                    
                    active_roster_count += 1

                # Write to shared cache so /submissions/ sees the same value on first load
                cache.set(roster_cache_key, active_roster_count, ROSTER_CACHE_TTL)
            
            allot_data = TestCentreAllotmentSerializer(allotment).data
            allot_data['submission_count'] = submission_count
            allot_data['total_students_in_centre'] = active_roster_count
            data.append(allot_data)
            
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
            'status': 'submitted' if sub.is_finalized else 'interrupted',
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
        
        test = self.get_object()
        centre_code = request.query_params.get('centre_code')
        if not centre_code:
            return Response({'detail': 'centre_code is required'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Fetch ALL relevant submissions for this test
        all_submissions_list = TestSubmission.objects.filter(test=test)
        sub_map = {str(s.student_id): s for s in all_submissions_list}

        from centres.models import Centre
        cent_obj = Centre.objects.filter(code__iexact=centre_code).first()
        cent_name = cent_obj.name if cent_obj else None

        from django.db.models import Q
        # 2. Identify all potential students for this centre
        centre_query = Q(centre_code__iexact=centre_code)
        if cent_name:
            centre_query |= Q(centre_name__iexact=cent_name)
            
        rooster_students = list(CustomUser.objects.filter(user_type='student').filter(centre_query))
        
        # Identify allowed section names for this test (robust case-insensitive)
        allowed_sections_list = [s.name.strip().lower() for s in test.allotted_sections.all()]
        
        # 3. Filter Local Students by Section allotted (Always include those who have a submission)
        from api.db_utils import parse_section
        all_students = []
        seen_identifiers = set()

        for student in rooster_students:
            uid_str = str(student.pk)
            # Always include if there is an active submission
            has_submission = uid_str in sub_map
            
            # Identifier tracking for ERP merge
            if student.username: seen_identifiers.add(student.username.upper().strip())
            if student.admission_number: seen_identifiers.add(student.admission_number.upper().strip())
            if student.email: seen_identifiers.add(student.email.lower().strip())

            if not has_submission and allowed_sections_list:
                # Restricted: Check if student section matches
                s_exams = [s.lower() for s in parse_section(student.exam_section)]
                s_studies = [s.lower() for s in parse_section(student.study_section)]
                if not any(sec in allowed_sections_list for sec in (s_exams + s_studies)):
                    continue
            
            all_students.append(student)

        # 4. Merge students from ERP bulk data who match Centre and Section but haven't logged in yet
        from django.core.cache import cache
        erp_pool = cache.get('erp_all_students_v1') or []
        for erp_student in erp_pool:
            e_centre = str(erp_student.get('centre') or '').upper().strip()
            if not e_centre or not cent_name or (cent_name.upper() not in e_centre and e_centre not in cent_name.upper()):
                continue
            
            # Section check
            if allowed_sections_list:
                sec_allot = erp_student.get('sectionAllotment', {})
                e_exams = [s.lower() for s in parse_section(sec_allot.get('examSection'))]
                e_studies = [s.lower() for s in parse_section(sec_allot.get('studySection'))]
                if not any(sec in allowed_sections_list for sec in (e_exams + e_studies)):
                    continue
            
            # Deduplicate
            e_adm = str(erp_student.get('admissionNumber') or '').upper().strip()
            e_email = str(erp_student.get('student', {}).get('studentsDetails', [{}])[0].get('studentEmail') or "").lower().strip()
            if (e_adm and e_adm in seen_identifiers) or (e_email and e_email in seen_identifiers):
                continue
            
            # Create Mock Profile for listing
            from types import SimpleNamespace
            details = erp_student.get('student', {}).get('studentsDetails', [{}])[0]
            sn = str(details.get('studentName') or 'Student').strip()
            sp = sn.split(' ')
            mock = SimpleNamespace(
                pk=None, username=e_adm, email=e_email or f"{e_adm.lower()}@unknown.com",
                first_name=sp[0], last_name=' '.join(sp[1:]) if len(sp) > 1 else '',
                admission_number=e_adm, exam_section=erp_student.get('sectionAllotment', {}).get('examSection'),
                study_section=erp_student.get('sectionAllotment', {}).get('studySection'),
                rm_code=None, omr_code=None, employee_id=None, user_type='student'
            )
            all_students.append(mock)
            if e_adm: seen_identifiers.add(e_adm)
            if e_email: seen_identifiers.add(e_email)

        # 5. Get ERP index for enrichment (used in loop below)
        from api.erp_views import get_student_lookup_index
        erp_index = get_student_lookup_index()

        data = []
        for student in all_students:
            uid_str = str(student.pk)
            sub = sub_map.get(uid_str)
            # 3. Get ERP index lookup keys from student profile
            # Prefer official email then lower/upper username variations
            search_email = str(student.email or "").strip().lower()
            u_clean = str(student.username or "").strip()
            
            erp_data = None
            if erp_index:
                erp_data = erp_index.get(f"email_{search_email}") or \
                           erp_index.get(f"adm_{u_clean.upper()}") or \
                           erp_index.get(f"adm_{u_clean.lower()}")
            
            # Extract academic IDs from ERP if available
            lib_adm = erp_data.get('admissionNumber') if erp_data else None
            lib_sec = erp_data.get('sectionAllotment', {}).get('examSection') if erp_data and isinstance(erp_data.get('sectionAllotment'), dict) else None
            lib_rm = erp_data.get('sectionAllotment', {}).get('rm') if erp_data and isinstance(erp_data.get('sectionAllotment'), dict) else None
            
            # Prioritize Admissions Number over RM/OMR codes (ERP data is freshest)
            # Prioritize Admissions Number over RM/OMR codes (ERP data is freshest)
            enr_raw = lib_adm or student.admission_number or student.rm_code or student.omr_code or lib_rm or student.employee_id or ''
            if isinstance(enr_raw, list):
                enr_raw = "".join(map(str, enr_raw))
            enroll = str(enr_raw).upper().strip()
            # Prioritize Section from ERP Registry over local profile (Sync sometimes lags)
            sec_raw = lib_sec or student.exam_section or '—'
            if isinstance(sec_raw, list):
                sec_raw = ", ".join(map(str, sec_raw))
            section = str(sec_raw).upper().strip()
            
            # Cleanliness check: ensure we don't return garbage or emails as enrollment
            if not enroll or '@' in enroll:
                enroll = 'ID MISSING'

            data.append({
                'id': str(sub.id) if sub else None,
                'student_id': uid_str,
                'student_name': (f"{student.first_name} {student.last_name}".strip() or student.username).upper(),
                'username': student.username,
                'email': student.email,
                'enroll_number': enroll,
                'section': section,
                'score': sub.score if sub else None,
                'submission_type': sub.submission_type if sub else None,
                'time_spent': sub.time_spent if sub else 0,
                'submitted_at': sub.submitted_at.isoformat() if sub else None,
                'status': 'Submitted' if sub and sub.is_finalized else ('In Progress' if sub else 'Available'),
                'allow_resume': sub.allow_resume if sub else False,
                'is_finalized': sub.is_finalized if sub else False
            })
            
        # Write this roster count to the shared cache so /centres/ sees the same number
        from django.core.cache import cache as django_cache
        roster_cache_key = f'roster_count_{test.pk}_{centre_code}'
        django_cache.set(roster_cache_key, len(all_students), 600)  # 10 min TTL

        return Response({
            'allotted_sections': list(test.allotted_sections.values_list('name', flat=True)),
            'data': data
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
        subs = TestSubmission.objects.filter(test=test, student_id=sid)
        if subs.exists():
            subs.delete()
            return Response({'success': True, 'message': 'Exam reset successfully. Student can now restart.'})
        return Response({'success': True, 'message': 'No session found to reset.'})

    @action(detail=True, methods=['post'], url_path='save_progress')
    def save_progress(self, request, pk=None):
        test = self.get_object()
        user = request.user
        responses = request.data.get('responses', {})
        time_spent = request.data.get('time_spent', 0)
        
        # DJONGO WORKAROUND: Use update() to avoid duplicate key errors during save()
        updated = TestSubmission.objects.filter(test=test, student=user, is_finalized=False).update(
            responses=responses,
            time_spent=time_spent,
            allow_resume=False
        )
        
        if not updated:
            if TestSubmission.objects.filter(test=test, student=user, is_finalized=True).exists():
                return Response({'error': 'Test already submitted. Contact admin to reset.'}, status=403)
            
            try:
                TestSubmission.objects.create(
                    test=test, student=user, 
                    responses=responses, 
                    time_spent=time_spent, 
                    allow_resume=False
                )
            except:
                TestSubmission.objects.filter(test=test, student=user, is_finalized=False).update(
                    responses=responses,
                    time_spent=time_spent,
                    allow_resume=False
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
            'is_finalized': True # Submitting finalizes it
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
