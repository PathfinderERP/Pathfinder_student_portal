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
            exam_section = getattr(user, 'exam_section', '')
            study_section = getattr(user, 'study_section', '')
            allowed_names = [n.strip() for n in [exam_section, study_section] if n and str(n).strip()]
            
            # Smart Restricted Access:
            # - Student ONLY sees tests explicitly allotted to their exam or study section.
            # - Tests with NO allotments (draft/orphan) are hidden from students.
            if allowed_names:
                from django.db.models import Q
                q_filter = Q()
                for section_name in allowed_names:
                    q_filter |= Q(allotted_sections__name__iexact=section_name)
                # Note: Avoiding .distinct() here because Djongo SQL parser often crashes on it with M2M.
                queryset = queryset.filter(q_filter)
            else:
                # Tight security: students without section info can't see any tests
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
        # Auto-create allotment records for centres
        for centre in instance.centres.all():
            TestCentreAllotment.objects.get_or_create(test=instance, centre=centre)

    def perform_update(self, serializer):
        instance = serializer.save()
        
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
            
            # Filtered Rooster Count (Matches the logic in 'submissions' view)
            # Only count students who belong to this centre AND are "Active"
            # (Either have an ID, a Section, or they started the test)
            centre_query = Q(centre_code__iexact=c_code) | Q(centre_name__iexact=c_name)
            active_roster_count = CustomUser.objects.filter(user_type='student').filter(centre_query).filter(
                Q(admission_number__isnull=False) & ~Q(admission_number='') |
                Q(exam_section__isnull=False) & ~Q(exam_section='') |
                Q(pk__in=all_submitted_student_ids)
            ).count()
            
            allot_data = TestCentreAllotmentSerializer(allotment).data
            allot_data['submission_count'] = submission_count # This reflects attempted tests
            allot_data['total_students_in_centre'] = active_roster_count # This reflects the visible list
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
        
        # DJONGO WORKAROUND: Pull to list early and handle in Python to bypass RecursionError in SQL parser
        sub_list = list(TestSubmission.objects.filter(test=test, student=user))
        if sub_list:
            # Sort by submitted_at DESC in Python
            sub_list.sort(key=lambda x: x.submitted_at, reverse=True)
            sub = sub_list[0]
            # Self-heal: Use timestamp-based delete to avoid Djongo's ID/ObjectId type mismatch crash
            if len(sub_list) > 1:
                TestSubmission.objects.filter(test=test, student=user, submitted_at__lt=sub.submitted_at).delete()
        else:
            sub = TestSubmission.objects.create(test=test, student=user)

        # Grant a one-time "Handshake" permission to enter the engine.
        # This will be consumed by the first 'save_progress' call inside the engine.
        sub.allow_resume = True
        sub.save()
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
        
        # 3. Refined Selection: ONLY keep students who are "Active"
        # (Must have ID, Section, or an Active Submission)
        all_students = []
        for student in rooster_students:
            uid_str = str(student.pk)
            has_sub = uid_str in sub_map
            
            if not student.admission_number and not student.exam_section and not has_sub:
                continue
            all_students.append(student)

        # 4. Get ERP index for enrichment
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
            
            # Prioritize Admissions Number over RM/OMR codes
            enroll = (student.admission_number or lib_adm or student.rm_code or student.omr_code or lib_rm or student.employee_id or '').upper().strip()
            section = (student.exam_section or lib_sec or '—').upper().strip()
            
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
            
        return Response(data)

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

        sub = TestSubmission.objects.filter(test=test, student_id=sid).first()
        if sub:
            sub.allow_resume = True
            sub.save()
            return Response({'message': 'System unlocked. Student can now resume their exam.'})
        
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
        
        from .models import TestSubmission
        # DJONGO WORKAROUND: Handle filtering/sorting in Python to avoid SQLParse recursion crash
        sub_list = list(TestSubmission.objects.filter(test=test, student=user))
        if sub_list:
            sub_list.sort(key=lambda x: x.submitted_at, reverse=True)
            sub = sub_list[0]
            # Bulk delete orphans via timestamp to avoid Djongo ID type mismatch errors
            if len(sub_list) > 1:
                TestSubmission.objects.filter(test=test, student=user, submitted_at__lt=sub.submitted_at).delete()
        else:
            sub = TestSubmission.objects.create(test=test, student=user)
        
        # Don't allow saving over a finalized submission
        if sub.is_finalized:
            return Response({'error': 'Test already submitted. Contact admin to reset.'}, status=403)
            
        sub.responses = responses
        sub.time_spent = time_spent
        # Consume the "Resume Permission" as they are now successfully active.
        # This keeps the session secure by requiring a new unlock if they exit again.
        sub.allow_resume = False
        sub.save()
        return Response({'status': 'progress_saved'})

    @action(detail=True, methods=['post'], url_path='reset_test')
    def reset_test(self, request, pk=None):
        test = self.get_object()
        student_id = request.data.get('student_id')
        if not student_id:
            return Response({'error': 'Student ID is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        from .models import TestSubmission
        TestSubmission.objects.filter(test=test, student_id=student_id).delete()
        return Response({'message': 'Submission reset successfully. Student can now re-take the test.'})

    @action(detail=True, methods=['get'], url_path='question_paper')
    def question_paper(self, request, pk=None):
        try:
            test = Test.objects.get(pk=pk)
        except Test.DoesNotExist:
            return Response({'detail': 'Test not found'}, status=status.HTTP_404_NOT_FOUND)
        # Order by priority
        sections = test.allotted_sections.all().order_by('priority')
        
        sections_data = []
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
            
        return Response({
            'test_name': test.name,
            'test_code': test.code,
            'duration': test.duration,
            'sections': sections_data
        })

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
            
        student_centre_code = getattr(user, 'centre_code', None)
        if not student_centre_code:
            return Response({'error': 'Student centre information not found. Please contact admin.'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            # We use direct 모델 lookup to avoid get_queryset filters if necessary, 
            # though get_queryset for students already filters for their sections.
            # But the centre allotment is a better source of truth for "active status".
            allotment = TestCentreAllotment.objects.get(test=test, centre__code=student_centre_code)
        except TestCentreAllotment.DoesNotExist:
            return Response({'error': 'Test is not allotted to your centre.'}, status=status.HTTP_403_FORBIDDEN)
            
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
        
        # Save or Update Submission (Self-heal duplicates via Python-side resolution for Djongo stability)
        from .models import TestSubmission
        sub_list = list(TestSubmission.objects.filter(test=test, student=user))
        
        upd_data = {
            'responses': responses,
            'submission_type': submission_type,
            'time_spent': time_spent,
            'score': round(total_score, 2)
        }
        
        if sub_list:
            sub_list.sort(key=lambda x: x.submitted_at, reverse=True)
            submission = sub_list[0]
            for key, val in upd_data.items():
                setattr(submission, key, val)
            submission.save()
            # Clean up duplicates via timestamp to bypass Djongo SQL translation bugs
            if len(sub_list) > 1:
                TestSubmission.objects.filter(test=test, student=user, submitted_at__lt=submission.submitted_at).delete()
        else:
            submission = TestSubmission.objects.create(test=test, student=user, **upd_data)
        
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
            allotment.save()
            return Response({'message': f'Access code sent to {email}'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
