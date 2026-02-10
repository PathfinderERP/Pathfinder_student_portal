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
        queryset = Test.objects.all().order_by('-created_at')
        package_id = self.request.query_params.get('package', None)
        if package_id:
            # Djongo sometimes prefers the explicit _id field or the model field name
            from bson import ObjectId
            try:
                if package_id:
                    queryset = queryset.filter(package_id=ObjectId(package_id))
            except Exception:
                # If invalid objectID is passed, return empty or handle gracefully
                queryset = queryset.none()
        return queryset

    def perform_create(self, serializer):
        instance = serializer.save()
        # Auto-create allotment records for centres
        for centre in instance.centres.all():
            TestCentreAllotment.objects.get_or_create(test=instance, centre=centre)

    def perform_update(self, serializer):
        instance = serializer.save()
        
        # Get current allowed centres IDs as a list to avoid SQL subqueries that confuse Djongo
        # Use '_id' explicitly as 'id' is not a concrete field in this Mongo model
        current_centre_ids = list(instance.centres.values_list('_id', flat=True))
        
        # Delete allotments for centres that are no longer in the list
        # Using explicit ID list avoids complex subquery generation
        test_allotments = TestCentreAllotment.objects.filter(test=instance)
        test_allotments.exclude(centre__pk__in=current_centre_ids).delete()

        # Auto-create allotment records for new/existing selected centres
        for centre in instance.centres.all():
            TestCentreAllotment.objects.get_or_create(test=instance, centre=centre)

    @action(detail=True, methods=['get'])
    def sections(self, request, pk=None):
        test = self.get_object()
        sections = test.allotted_sections.all()
        serializer = SectionSerializer(sections, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def centres(self, request, pk=None):
        test = self.get_object()
        allotments = test.centre_allotments.all()
        serializer = TestCentreAllotmentSerializer(allotments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def question_paper(self, request, pk=None):
        test = self.get_object()
        # Order by priority
        sections = test.allotted_sections.all().order_by('priority')
        
        sections_data = []
        for section in sections:
            section_dict = SectionSerializer(section).data
            # Fetch detailed questions
            questions = section.questions.all()
            section_dict['questions_detail'] = QuestionSerializer(questions, many=True).data
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
            return Response({'message': f'Access code sent to {email}'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
