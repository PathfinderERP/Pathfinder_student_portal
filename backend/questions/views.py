from rest_framework import viewsets, permissions, status, pagination
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
import os
import json
import uuid
from datetime import timedelta
import fitz  # PyMuPDF
import PIL.Image
import google.generativeai as genai
from django.core.files.base import ContentFile
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser

class QuestionPagination(pagination.PageNumberPagination):
    page_size = 20

class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.all()
    serializer_class = QuestionSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def list(self, request, *args, **kwargs):
        from django.core.cache import cache
        is_unfiltered = len(request.query_params) == 0
        cache_key = "question_bank_all_v1"

        if is_unfiltered:
            cached_data = cache.get(cache_key)
            if cached_data is not None:
                return Response(cached_data)

        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        data = serializer.data

        if is_unfiltered:
            cache.set(cache_key, data, 86400 * 7) # 7-day cache, invalidated on mutation

        return Response(data)
    
    def get_queryset(self):
        queryset = Question.objects.all()
        
        # Extended Filtering Logic
        filters = {
            'subject': 'subject__id',
            'topic': 'topic__id',
            'class_level': 'class_level',
            'exam_type': 'exam_type__id',
            'exam_type_name': 'exam_type__name__iexact',
            'target_exam': 'target_exam__id',
            'test_name': 'test_name__id',
            'chapter': 'chapter__id',
            'is_wrong': 'is_wrong'
        }

        for param, field in filters.items():
            val = self.request.query_params.get(param)
            if val:
                if val.lower() == 'null':
                    queryset = queryset.filter(**{f"{field.split('__')[0]}__isnull": True})
                elif param == 'is_wrong':
                    queryset = queryset.filter(is_wrong=val.lower() == 'true')
                else:
                    queryset = queryset.filter(**{field: val})

        # Difficulty level filter (direct CharField, not a FK)
        difficulty = self.request.query_params.get('difficulty_level')
        if difficulty:
            queryset = queryset.filter(difficulty_level=difficulty)

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

    @action(detail=False, methods=['get'], url_path='chapters-with-questions')
    def chapters_with_questions(self, request):
        """
        Returns distinct chapter IDs that have at least one question.
        Accepts optional ?subject=<id> to scope results to a subject.
        Response: [{"id": <chapter_id>, "name": <chapter_name>}, ...]

        NOTE: We materialize chapter_ids into a Python list before the second
        query to avoid Djongo's inability to handle IN (SELECT ...) subqueries.








































        """
        from master_data.models import Chapter

        qs = Question.objects.filter(chapter__isnull=False)

        subject_id = request.query_params.get('subject')
        class_level = request.query_params.get('class_level')
        target_exam = request.query_params.get('target_exam')
        exam_type_name = request.query_params.get('exam_type_name')

        if subject_id:
            qs = qs.filter(subject__id=subject_id)
        if class_level:
            qs = qs.filter(class_level=class_level)
        if target_exam:
            qs = qs.filter(target_exam__id=target_exam)
        if exam_type_name:
            qs = qs.filter(exam_type__name__iexact=exam_type_name)

        # ── Step 1: pull IDs into Python memory (avoids Djongo subquery bug) ──
        chapter_ids = list(qs.values_list('chapter_id', flat=True).distinct())

        if not chapter_ids:
            return Response([])

        # ── Step 2: fetch Chapter objects using the plain list ─────────────────
        chapters = (
            Chapter.objects
            .filter(pk__in=chapter_ids)
            .values('id', 'name')
            .order_by('name')
        )
        return Response(list(chapters))

    @action(detail=False, methods=['get'])
    def stats(self, request):

        from django.core.cache import cache
        force_refresh = request.query_params.get('refresh', 'false').lower() == 'true'
        cache_key = "dashboard_question_stats_v1"
        
        if not force_refresh:
            cached = cache.get(cache_key)
            if cached:
                return Response(cached)

        total = Question.objects.count()
        
        # This Month
        now = timezone.now()
        first_day_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        this_month_count = Question.objects.filter(created_at__gte=first_day_of_month).count()
        
        # Last Batch (Last created question time)
        last_question = Question.objects.order_by('-created_at').only('created_at').first()
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
            
        data = {
            "total": total,
            "thisMonth": this_month_count,
            "lastBatch": last_batch
        }
        cache.set(cache_key, data, 3600) # 1 hour cache
        return Response(data)

    @action(detail=True, methods=['post'])
    def mark_wrong(self, request, pk=None):
        question = self.get_object()
        question.is_wrong = not question.is_wrong
        question.save(update_fields=['is_wrong'])
        self._clear_global_caches()
        return Response({
            'status': 'marked as wrong',
            'is_wrong': question.is_wrong
        })

    @action(detail=False, methods=['post'], url_path='bulk-delete')
    def bulk_delete(self, request):
        ids = request.data.get('ids', [])
        if not ids:
            return Response({"error": "No IDs provided"}, status=400)
        
        object_ids = []
        for id_str in ids:
            if ObjectId.is_valid(id_str):
                object_ids.append(ObjectId(id_str))
            else:
                try:
                    object_ids.append(int(id_str))
                except: pass
        
        deleted_count, _ = Question.objects.filter(pk__in=object_ids).delete()
        self._clear_global_caches()
        return Response({"message": f"Successfully deleted {deleted_count} questions"})

    @action(detail=False, methods=['post'], url_path='bulk-update')
    def bulk_update(self, request):
        ids = request.data.get('ids', [])
        updates = request.data.get('updates', {})
        
        if not ids or not updates:
            return Response({"error": "No IDs or updates provided"}, status=400)
            
        object_ids = []
        for id_str in ids:
            if ObjectId.is_valid(id_str):
                object_ids.append(ObjectId(id_str))
            else:
                try:
                    object_ids.append(int(id_str))
                except: pass
        
        allowed_fields = ['difficulty_level', 'subject', 'chapter', 'topic', 'class_level', 'exam_type', 'target_exam', 'test_name', 'is_wrong', 'solve_time']
        clean_updates = {k: v for k, v in updates.items() if k in allowed_fields and v != ''}
        
        if not clean_updates:
            return Response({"error": "No valid fields to update"}, status=400)

        try:
            final_updates = {}
            for k, v in clean_updates.items():
                if k in ['subject', 'chapter', 'topic', 'class_level', 'exam_type', 'target_exam', 'test_name']:
                    final_updates[f"{k}_id"] = ObjectId(v) if ObjectId.is_valid(v) else v
                    plural_key = 'class_levels' if k == 'class_level' else f"{k}s"
                    final_updates[plural_key] = [str(v)]
                elif k == 'difficulty_level':
                    final_updates['difficulty_level'] = str(v)
                    final_updates['difficulty_levels'] = [str(v)]
                elif k == 'is_wrong':
                    final_updates[k] = v.lower() == 'true' if isinstance(v, str) else bool(v)
                elif k == 'solve_time':
                    try:
                        final_updates[k] = int(v)
                    except ValueError:
                        final_updates[k] = v
                else:
                    final_updates[k] = v
                    
            updated_count = Question.objects.filter(pk__in=object_ids).update(**final_updates)
            self._clear_global_caches()
            return Response({"message": f"Successfully updated {updated_count} questions"})
        except Exception as e:
            return Response({"error": str(e)}, status=500)

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
            
            for row_idx, row in enumerate(reader, start=2):
                try:
                    if not row or len(row) < 18:
                        if any(row):
                            errors.append(f"Row {row_idx}: Incomplete data (expected at least 18 columns)")
                        continue
                        
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

                    class_level = ClassLevel.objects.filter(name__iexact=class_name).first() if class_name else None
                    subject = Subject.objects.filter(name__iexact=subject_name).first() if subject_name else None
                    topic = Topic.objects.filter(name__iexact=topic_name).first() if topic_name else None
                    exam_type = ExamType.objects.filter(name__iexact=exam_type_name).first() if exam_type_name else None
                    target_exam = TargetExam.objects.filter(name__iexact=target_exam_name).first() if target_exam_name else None
                    
                    options = []
                    if q_type in ['SINGLE_CHOICE', 'MULTI_CHOICE']:
                        ans_list = [ans1, ans2, ans3, ans4]
                        for i, ans in enumerate(ans_list, 1):
                            if ans:
                                label = chr(64 + i)
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
                    
                    q_obj = Question(
                        class_level=class_level,
                        subject=subject,
                        topic=topic,
                        exam_type=exam_type,
                        target_exam=target_exam,
                        question_type=q_type,
                        difficulty_level=level if level else '1',
                        content=question_text,
                        image_1=image_url_1,
                        image_2=image_url_2,
                        question_options=options,
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
            
            self._clear_global_caches()
            return Response({
                "message": f"Successfully imported {created_count} questions",
                "errors": errors
            }, status=status.HTTP_201_CREATED if created_count > 0 else status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": f"Failed to process file: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _clear_global_caches(self):
        from django.core.cache import cache
        from django.utils import timezone
        cache.delete("dashboard_question_stats_v1")
        cache.delete("dashboard_section_stats_v1")
        cache.delete("question_bank_all_v1")
        cache.set("global_test_update_v1", timezone.now().timestamp(), 86400 * 30)

    def _sync_single_and_multi_fields(self, instance):
        updated = False
        # Sync class_level <-> class_levels
        if instance.class_levels and not instance.class_level_id:
            try:
                from master_data.models import ClassLevel
                first_id = instance.class_levels[0]
                instance.class_level = ClassLevel.objects.filter(pk=first_id).first()
                updated = True
            except: pass
        elif instance.class_level_id and not instance.class_levels:
            instance.class_levels = [str(instance.class_level_id)]
            updated = True

        # Sync subject <-> subjects
        if instance.subjects and not instance.subject_id:
            try:
                from master_data.models import Subject
                first_id = instance.subjects[0]
                instance.subject = Subject.objects.filter(pk=first_id).first()
                updated = True
            except: pass
        elif instance.subject_id and not instance.subjects:
            instance.subjects = [str(instance.subject_id)]
            updated = True

        # Sync chapter <-> chapters
        if instance.chapters and not instance.chapter_id:
            try:
                from master_data.models import Chapter
                first_id = instance.chapters[0]
                instance.chapter = Chapter.objects.filter(pk=first_id).first()
                updated = True
            except: pass
        elif instance.chapter_id and not instance.chapters:
            instance.chapters = [str(instance.chapter_id)]
            updated = True

        # Sync topic <-> topics
        if instance.topics and not instance.topic_id:
            try:
                from master_data.models import Topic
                first_id = instance.topics[0]
                instance.topic = Topic.objects.filter(pk=first_id).first()
                updated = True
            except: pass
        elif instance.topic_id and not instance.topics:
            instance.topics = [str(instance.topic_id)]
            updated = True

        # Sync exam_type <-> exam_types
        if instance.exam_types and not instance.exam_type_id:
            try:
                from master_data.models import ExamType
                first_id = instance.exam_types[0]
                instance.exam_type = ExamType.objects.filter(pk=first_id).first()
                updated = True
            except: pass
        elif instance.exam_type_id and not instance.exam_types:
            instance.exam_types = [str(instance.exam_type_id)]
            updated = True

        # Sync target_exam <-> target_exams
        if instance.target_exams and not instance.target_exam_id:
            try:
                from master_data.models import TargetExam
                first_id = instance.target_exams[0]
                instance.target_exam = TargetExam.objects.filter(pk=first_id).first()
                updated = True
            except: pass
        elif instance.target_exam_id and not instance.target_exams:
            instance.target_exams = [str(instance.target_exam_id)]
            updated = True

        # Sync test_name <-> test_names
        if instance.test_names and not instance.test_name_id:
            try:
                from master_data.models import ExamDetail
                first_id = instance.test_names[0]
                instance.test_name = ExamDetail.objects.filter(pk=first_id).first()
                updated = True
            except: pass
        elif instance.test_name_id and not instance.test_names:
            instance.test_names = [str(instance.test_name_id)]
            updated = True

        # Sync difficulty_level <-> difficulty_levels
        if instance.difficulty_levels and not instance.difficulty_level:
            instance.difficulty_level = str(instance.difficulty_levels[0])
            updated = True
        elif instance.difficulty_level and not instance.difficulty_levels:
            instance.difficulty_levels = [str(instance.difficulty_level)]
            updated = True

        if updated:
            instance.save()

    def perform_create(self, serializer):
        instance = serializer.save()
        self._sync_single_and_multi_fields(instance)
        self._clear_global_caches()

    def perform_update(self, serializer):
        instance = serializer.save()
        self._sync_single_and_multi_fields(instance)
        self._clear_global_caches()

    def perform_destroy(self, instance):
        instance.delete()
        self._clear_global_caches()

class ExtractAIView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        try:
            file_obj = request.FILES.get('file')
            if not file_obj:
                return Response({"status": "error", "message": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)

            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                return Response({"status": "error", "message": "GEMINI_API_KEY not configured"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(
                'gemini-2.5-flash',
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    temperature=0.4
                )
            )

            file_bytes = file_obj.read()
            images_to_process = []
            filename = file_obj.name.lower() if file_obj.name else ''

            try:
                if filename.endswith('.pdf') or file_obj.content_type == 'application/pdf':
                    doc = fitz.open(stream=file_bytes, filetype="pdf")
                    for page_num in range(len(doc)):
                        page = doc.load_page(page_num)
                        pix = page.get_pixmap(dpi=150)
                        img_bytes = pix.tobytes("png")
                        images_to_process.append(PIL.Image.open(io.BytesIO(img_bytes)))
                    doc.close()
                else:
                    images_to_process.append(PIL.Image.open(io.BytesIO(file_bytes)))
            except Exception as e:
                return Response({"status": "error", "message": f"Failed to parse file: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

            all_questions = []
            raw_texts = []

            prompt = """
            You are an AI assistant parsing exam questions.
            Look at the uploaded image. It may contain one or MORE multiple-choice questions.
            Extract EVERY question text, its options, and its correct answer if visible.
            
            CRITICAL: Keep the solution concise and to the point. DO NOT repeat the final answer or sentences multiple times.
            
            CRITICAL: For ANY mathematical equations, formulas, fractions, subscripts, superscripts, or special symbols, you MUST format them using standard LaTeX mathematical notation wrapped in $ for inline math (e.g., $x^2 + y^2 = r^2$) or $$ for block math.
            BECAUSE you are returning JSON, you MUST double-escape all backslashes in your LaTeX so the JSON is valid. For example, you must output "\\\\frac{n-1}{a_1a_{n+1}}" instead of "\\frac{n-1}{a_1a_{n+1}}". Do NOT output raw text like (n-1)/(a1an+1).
            
            If there is a detailed solution, a step-by-step explanation, OR ANY short reference text (e.g. "NCERT XII Page No 7") provided for the question after the answer, extract ALL of it into the "solution" field, ensuring ALL mathematical steps are properly formatted in LaTeX with double-escaped backslashes.
            
            If a question contains a diagram, chart, or icon, you must provide its bounding box coordinates in the format [ymin, xmin, ymax, xmax].
            The coordinates MUST be integers between 0 and 1000, representing the relative position in the image.
            If there is no diagram for a question, set "diagramBox" to null.
            
            Return ONLY a valid JSON ARRAY of objects in this exact structure without markdown formatting or code blocks:
            [
              {
                "question": "Question text here with $math$...",
                "options": ["$Option A$", "Option B", "Option C", "Option D"],
                "correctAnswer": "A",
                "solution": "Detailed step-by-step explanation with $$math$$ here...",
                "diagramBox": [200, 100, 400, 300]
              },
              ...
            ]
            """

            for idx, image in enumerate(images_to_process):
                image_width, image_height = image.size
                try:
                    response = model.generate_content([prompt, image])
                    raw_text = response.text.strip()
                    raw_texts.append(f"--- PAGE {idx + 1} ---\n{raw_text}")
                    
                    if raw_text.startswith("```json"):
                        raw_text = raw_text.replace("```json", "", 1).replace("```", "")
                    elif raw_text.startswith("```"):
                        raw_text = raw_text.replace("```", "", 1).replace("```", "")
                        
                    import re
                    # Add missing comma between string values and the next key
                    raw_text = re.sub(r'("\s*)\n\s*(?="[a-zA-Z0-9_]+"\s*:)', r'\1,\n', raw_text)
                    # Add missing comma between null/numbers/booleans and the next key
                    raw_text = re.sub(r'(null|true|false|\d+)\s*\n\s*(?="[a-zA-Z0-9_]+"\s*:)', r'\1,\n', raw_text)
                    # Add missing comma between closing brackets and the next key
                    raw_text = re.sub(r'([\]}])\s*\n\s*(?="[a-zA-Z0-9_]+"\s*:)', r'\1,\n', raw_text)
                    # Add missing comma between objects in array
                    raw_text = re.sub(r'}\s*\n\s*\{', '},\n{', raw_text)
                    
                    questions = json.loads(raw_text.strip())
                    
                    for q in questions:
                        box = q.get("diagramBox")
                        if box and isinstance(box, list) and len(box) == 4:
                            ymin, xmin, ymax, xmax = box
                            left = (xmin / 1000.0) * image_width
                            top = (ymin / 1000.0) * image_height
                            right = (xmax / 1000.0) * image_width
                            bottom = (ymax / 1000.0) * image_height
                            
                            padding = 40
                            left = max(0, left - padding)
                            top = max(0, top - padding)
                            right = min(image_width, right + padding)
                            bottom = min(image_height, bottom + padding)
                            
                            cropped_img = image.crop((left, top, right, bottom))
                            img_io = io.BytesIO()
                            cropped_img.save(img_io, format='PNG')
                            img_io.seek(0)
                            
                            unique_filename = f"diagram_{uuid.uuid4().hex[:8]}.png"
                            q_image = QuestionImage.objects.create(image=ContentFile(img_io.read(), name=unique_filename))
                            
                            # Use build_absolute_uri to provide full path to frontend
                            q["diagramUrl"] = request.build_absolute_uri(q_image.image.url)
                        
                        if "diagramBox" in q:
                            del q["diagramBox"]

                    all_questions.extend(questions)
                    
                except Exception as e:
                    import traceback
                    tb = traceback.format_exc()
                    with open("extract_error.log", "w") as f:
                        f.write(f"Error on page {idx+1}:\n{str(e)}\n\n{tb}\n\nRAW TEXT:\n{raw_text}")
                    return Response({"status": "error", "message": f"Error on page {idx + 1}: {str(e)}", "traceback": tb}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            return Response({"status": "success", "data": all_questions})
        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            with open("extract_error.log", "w") as f:
                f.write(f"Outer Exception:\n{str(e)}\n\n{tb}")
            return Response({"status": "error", "message": str(e), "traceback": tb}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
        queryset = QuestionImage.objects.select_related(
            'class_level', 'subject', 'topic', 'exam_type', 'target_exam'
        ).all()
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
