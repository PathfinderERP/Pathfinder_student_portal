from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .models import Question, QuestionImage
from .serializers import QuestionSerializer, QuestionImageSerializer
from master_data.models import ClassLevel, Subject, Topic, ExamType, TargetExam
from bson import ObjectId
import csv
import io
from datetime import timedelta

class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.all()
    serializer_class = QuestionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = Question.objects.all()
        # Optional: Add filtering here (e.g., by subject, topic)
        subject_id = self.request.query_params.get('subject', None)
        if subject_id:
            queryset = queryset.filter(subject__id=subject_id)
        return queryset.order_by('-created_at')

    def get_object(self):
        """
        Override get_object to explicitly handle ObjectId conversion which Djongo sometimes misses in ViewSets.
        """
        queryset = self.filter_queryset(self.get_queryset())
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        pk = self.kwargs.get(lookup_url_kwarg)

        if pk:
            try:
                # Try converting to ObjectId
                if ObjectId.is_valid(pk):
                    obj = queryset.get(pk=ObjectId(pk))
                    self.check_object_permissions(self.request, obj)
                    return obj
            except (Question.DoesNotExist, Exception):
                pass
        
        # Fallback to default behavior (which might raise 404)
        return super().get_object()

    @action(detail=False, methods=['get'])
    def stats(self, request):
        total = Question.objects.count()
        
        # This Month
        now = timezone.now()
        first_day_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        this_month_count = Question.objects.filter(created_at__gte=first_day_of_month).count()
        
        # Last Batch (Last created question time)
        last_question = Question.objects.order_by('-created_at').first()
        if last_question:
            diff = now - last_question.created_at
            if diff.days > 0:
                last_batch = f"{diff.days} days ago"
            elif diff.seconds > 3600:
                last_batch = f"{diff.seconds // 3600} hours ago"
            elif diff.seconds > 60:
                last_batch = f"{diff.seconds // 60} mins ago"
            else:
                last_batch = "Just now"
        else:
            last_batch = "No data"
            
        return Response({
            "total": total,
            "thisMonth": this_month_count,
            "lastBatch": last_batch
        })

    @action(detail=True, methods=['post'])
    def mark_wrong(self, request, pk=None):
        question = self.get_object()
        question.is_wrong = not question.is_wrong
        question.save(update_fields=['is_wrong'])
        return Response({'status': 'marked as wrong', 'is_wrong': question.is_wrong})

    @action(detail=False, methods=['post'], url_path='bulk-upload')
    def bulk_upload(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            decoded_file = file_obj.read().decode('utf-8')
            io_string = io.StringIO(decoded_file)
            reader = csv.reader(io_string)
            headers = next(reader) # skip headers
            
            created_count = 0
            errors = []
            
            for row_idx, row in enumerate(reader, start=2): # start=2 because 1 is header
                try:
                    # Expected CSV Format based on frontend template:
                    # SL NO (*), Class, Subject (*), Topic (*), Exam Type, Target Exam,
                    # Question Type (*), Level (*), Calculator(yes/no), Numeric(yes/no),
                    # Question (*), Question Image (1st) (*), Question Image (2nd),
                    # Answer 1 (*), Answer 2 (*), Answer 3 (*), Answer 4 (*), Correct Answer (*)
                    
                    if not row or len(row) < 18:
                        if any(row): # only error if row is not completely empty
                            errors.append(f"Row {row_idx}: Incomplete data (expected at least 18 columns)")
                        continue
                        
                    # Extract values
                    class_name = row[1].strip()
                    subject_name = row[2].strip()
                    topic_name = row[3].strip()
                    exam_type_name = row[4].strip()
                    target_exam_name = row[5].strip()
                    q_type = row[6].strip()
                    level = row[7].strip()
                    has_calc = row[8].strip().lower() == 'yes'
                    is_numeric = row[9].strip().lower() == 'yes'
                    question_text = row[10].strip()
                    image_url_1 = row[11].strip() if len(row) > 11 else ""
                    image_url_2 = row[12].strip() if len(row) > 12 else ""
                    
                    ans1 = row[13].strip()
                    ans2 = row[14].strip()
                    ans3 = row[15].strip()
                    ans4 = row[16].strip()
                    correct_ans = row[17].strip()
                    
                    if not subject_name or not topic_name or not q_type or not question_text:
                        errors.append(f"Row {row_idx}: Missing required fields (Subject, Topic, Type, or Question)")
                        continue

                    # Resolve foreign keys
                    class_level = ClassLevel.objects.filter(name__iexact=class_name).first() if class_name else None
                    subject = Subject.objects.filter(name__iexact=subject_name).first() if subject_name else None
                    topic = Topic.objects.filter(name__iexact=topic_name).first() if topic_name else None
                    exam_type = ExamType.objects.filter(name__iexact=exam_type_name).first() if exam_type_name else None
                    target_exam = TargetExam.objects.filter(name__iexact=target_exam_name).first() if target_exam_name else None
                    
                    # Options structure
                    options = []
                    if q_type in ['SINGLE_CHOICE', 'MULTI_CHOICE']:
                        ans_list = [ans1, ans2, ans3, ans4]
                        for i, ans in enumerate(ans_list, 1):
                            if ans:
                                label = chr(64 + i) # A, B, C, D
                                is_correct = False
                                if q_type == 'SINGLE_CHOICE':
                                    is_correct = (correct_ans.upper() == label)
                                elif q_type == 'MULTI_CHOICE':
                                    is_correct = label in correct_ans.upper()
                                
                                options.append({
                                    "id": i,
                                    "content": ans,
                                    "isCorrect": is_correct
                                })
                    
                    # Create Question
                    q_obj = Question(
                        class_level=class_level,
                        subject=subject,
                        topic=topic,
                        exam_type=exam_type,
                        target_exam=target_exam,
                        question_type=q_type,
                        level=level if level else '1',
                        content=question_text,
                        image_1=image_url_1,
                        image_2=image_url_2,
                        options=options,
                        has_calculator=has_calc,
                        use_numeric_options=is_numeric
                    )
                    
                    if q_type in ['NUMERICAL', 'INTEGER_TYPE'] and correct_ans:
                        try:
                            if '-' in correct_ans:
                                start, end = correct_ans.split('-')
                                q_obj.answer_from = float(start)
                                q_obj.answer_to = float(end)
                            else:
                                val = float(correct_ans)
                                q_obj.answer_from = val
                                q_obj.answer_to = val
                        except ValueError:
                            pass
                            
                    q_obj.save()
                    created_count += 1
                    
                except Exception as e:
                    errors.append(f"Row {row_idx}: {str(e)}")
            
            return Response({
                "message": f"Successfully imported {created_count} questions",
                "errors": errors
            }, status=status.HTTP_201_CREATED if created_count > 0 else status.HTTP_200_OK)
            
        except Exception as e:
            return Response({"error": f"Failed to process file: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@method_decorator(csrf_exempt, name='dispatch')
class QuestionImageViewSet(viewsets.ModelViewSet):
    queryset = QuestionImage.objects.all()
    serializer_class = QuestionImageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        """
        Override get_object to explicitly handle ObjectId conversion for QuestionImage.
        """
        queryset = self.filter_queryset(self.get_queryset())
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        pk = self.kwargs.get(lookup_url_kwarg)

        if pk:
            try:
                if ObjectId.is_valid(pk):
                    obj = queryset.get(pk=ObjectId(pk))
                    self.check_object_permissions(self.request, obj)
                    return obj
            except (QuestionImage.DoesNotExist, Exception):
                pass
        
        return super().get_object()

    def get_queryset(self):
        queryset = QuestionImage.objects.all()
        class_id = self.request.query_params.get('class_level', None)
        subject_id = self.request.query_params.get('subject', None)
        topic_id = self.request.query_params.get('topic', None)

        if class_id:
            queryset = queryset.filter(class_level__id=class_id)
        if subject_id:
            queryset = queryset.filter(subject__id=subject_id)
        if topic_id:
            queryset = queryset.filter(topic__id=topic_id)
            
        return queryset.order_by('-created_at')
