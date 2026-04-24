from rest_framework import viewsets, permissions, response, pagination, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import HttpResponse
import csv
import io
import time
import requests
from api.erp_views import _get_erp_url, _get_erp_admin_token
import logging
from .models import Session, TargetExam, ExamType, ClassLevel, ExamDetail, Subject, Topic, Chapter, SubTopic, Teacher, LibraryItem, LibraryPDF, LibraryVideo, LibraryDPP, SolutionItem, Notice, LiveClass, Video, PenPaperTest, Homework, Banner, Seminar, Guide, Community, MasterSection
from .serializers import SessionSerializer, TargetExamSerializer, ExamTypeSerializer, ClassLevelSerializer, ExamDetailSerializer, SubjectSerializer, TopicSerializer, ChapterSerializer, SubTopicSerializer, TeacherSerializer, LibraryItemSerializer, SolutionItemSerializer, NoticeSerializer, LiveClassSerializer, VideoSerializer, PenPaperTestSerializer, HomeworkSerializer, BannerSerializer, SeminarSerializer, GuideSerializer, CommunitySerializer, MasterSectionSerializer

class StandardPagination(pagination.PageNumberPagination):
    page_size = 20
from django.db.models import Q, Count
from django.core.cache import cache
import re

class StudentSectionFilterMixin:
    """
    Mixin to filter querysets based on student's ERP section.
    """
    def filter_by_section(self, queryset, section_field='section'):
        user = self.request.user
        # Staff/Admin see everything
        if user.is_staff or user.is_superuser or getattr(user, 'user_type', None) != 'student':
            return queryset
            
        from api.db_utils import parse_section
        exam_sections = parse_section(getattr(user, 'exam_section', None))
        study_sections = parse_section(getattr(user, 'study_section', None))
        
        # Filter by section name matching student's exam_section OR study_section OR null (general)
        filter_q = Q(**{f"{section_field}__isnull": True})
        
        if exam_sections:
            filter_q |= Q(**{f"{section_field}__name__in": exam_sections})
            
        if study_sections:
            filter_q |= Q(**{f"{section_field}__name__in": study_sections})

        # Check if the model has 'is_general' field
        if hasattr(queryset.model, 'is_general'):
            filter_q |= Q(is_general=True)
            
        return queryset.filter(filter_q)

class CachedListViewSetMixin(object):
    """Mixin to cache the list response for master data and invalidate on change."""
    _local_cache = {} # Server-level fast memory to handle parallel request bursts

    def get_cache_version(self):
        """Gets the current version for this viewset class. IncrementING this clears all lists."""
        v_key = f"v_v2_{self.__class__.__name__}"
        v = cache.get(v_key)
        if v is None:
            v = 1
            cache.set(v_key, v, 86400 * 30) # Lasts 30 days
        return v

    def clear_cache(self):
        """Increment version to effectively invalidate all cached list responses instantly."""
        v_key = f"v_v2_{self.__class__.__name__}"
        try:
            cache.incr(v_key)
        except:
            # Fallback if incr fails
            v = cache.get(v_key, 1)
            cache.set(v_key, v + 1, 86400 * 30)
            
        # Clear local cache memory too
        self.__class__._local_cache = {}
        
        # Clear stats caches
        cache.delete("dashboard_section_stats_v1")
        cache.delete("dashboard_question_stats_v1")
        
        # Also bump the categorizer's global version so Foundation/Library tabs refresh
        from django.utils import timezone
        cache.set("global_test_update_v1", timezone.now().timestamp(), 86400 * 30)
        print(f"✓ Cache Version Updated: All {self.__class__.__name__} and Categorizer lists invalidated.")

    def get_cache_key(self):
        user = self.request.user
        base_key = f"md_v2_{self.__class__.__name__}_v{self.get_cache_version()}"
        
        # If this viewset uses StudentSectionFilterMixin, we must include the section in the cache key
        if isinstance(self, StudentSectionFilterMixin) and user.is_authenticated:
            # Use lower-case and normalize to avoid key issues
            exam_section = str(getattr(user, 'exam_section', 'none')).lower()
            study_section = str(getattr(user, 'study_section', 'none')).lower()
            return f"{base_key}_E{exam_section}_S{study_section}"
            
        return base_key

    def list(self, request, *args, **kwargs):
        # 1. Check for Force Refresh (Frontend requested bypass)
        force_refresh = request.query_params.get('refresh', 'false').lower() == 'true'
        cache_key = self.get_cache_key()
        now = time.time()

        if force_refresh:
            print(f"⚡ Force Refresh: Bypassing cache for {self.__class__.__name__}")
            res = super(CachedListViewSetMixin, self).list(request, *args, **kwargs)
            
            # Serialize ReturnList/ReturnDict before caching
            data_to_cache = res.data
            if isinstance(res.data, list):
                data_to_cache = [dict(item) for item in res.data]
            elif isinstance(res.data, dict):
                data_to_cache = dict(res.data)
                if 'results' in data_to_cache and isinstance(data_to_cache['results'], list):
                    data_to_cache['results'] = [dict(item) for item in data_to_cache['results']]
            
            cache.set(cache_key, data_to_cache, timeout=86400)
            self.__class__._local_cache[cache_key] = {'data': data_to_cache, 'time': now}
            res.data = data_to_cache
            return res

        # 2. Try Local Server Memory (Fastest - 0ms)
        local_entry = self.__class__._local_cache.get(cache_key)
        if local_entry and (now - local_entry['time'] < 5): # 5 second burst protection
            return response.Response(local_entry['data'])

        # 3. Try Redis/Cache (Fast - 50ms)
        cached_data = cache.get(cache_key)
        if cached_data is not None and isinstance(cached_data, (list, dict)):
            self.__class__._local_cache[cache_key] = {'data': cached_data, 'time': now}
            return response.Response(cached_data)
        
        # 4. DB Fallback (Slow - 500ms+)
        res = super(CachedListViewSetMixin, self).list(request, *args, **kwargs)
        timeout = 86400 if not isinstance(self, StudentSectionFilterMixin) else 3600
        
        # Serialize ReturnList/ReturnDict before caching
        data_to_cache = res.data
        if isinstance(res.data, list):
            data_to_cache = [dict(item) for item in res.data]
        elif isinstance(res.data, dict):
            data_to_cache = dict(res.data)
            if 'results' in data_to_cache and isinstance(data_to_cache['results'], list):
                data_to_cache['results'] = [dict(item) for item in data_to_cache['results']]

        cache.set(cache_key, data_to_cache, timeout=timeout)
        
        # Populate local cache
        self.__class__._local_cache[cache_key] = {'data': data_to_cache, 'time': now}
        res.data = data_to_cache
        return res

    def perform_create(self, serializer):
        serializer.save()
        self.clear_cache()

    def perform_update(self, serializer):
        serializer.save()
        self.clear_cache()

    def perform_destroy(self, instance):
        instance.delete()
        self.clear_cache()

class MasterSectionViewSet(CachedListViewSetMixin, viewsets.ModelViewSet):
    queryset = MasterSection.objects.all().order_by('priority', 'created_at')
    serializer_class = MasterSectionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save()
        self.clear_cache()

    def perform_update(self, serializer):
        serializer.save()
        self.clear_cache()

    def perform_destroy(self, instance):
        instance.delete()
        self.clear_cache()

class SessionViewSet(CachedListViewSetMixin, viewsets.ModelViewSet):
    queryset = Session.objects.all().order_by('-created_at')
    serializer_class = SessionSerializer

    def list(self, request, *args, **kwargs):
        # Auto-sync on list if requested
        if request.query_params.get('sync') == 'true':
            self.sync_erp(request)
        return super().list(request, *args, **kwargs)

    @action(detail=False, methods=['post'], url_path='sync-erp')
    def sync_erp(self, request):
        """Syncs Sessions from ERP to local Session model."""
        try:
            erp_url = _get_erp_url()
            token = _get_erp_admin_token()
            if not token:
                return response.Response({"error": "Failed to get ERP token"}, status=status.HTTP_401_UNAUTHORIZED)

            resp = requests.get(
                f"{erp_url}/api/session/list",
                headers={"Authorization": f"Bearer {token}"},
                timeout=30
            )

            if resp.status_code == 200:
                erp_sessions = resp.json()
                synced_ids = []
                
                for s in erp_sessions:
                    erp_id = s.get('_id')
                    name = s.get('sessionName')
                    
                    if not erp_id or not name:
                        continue
                        
                    # Update or create local session
                    obj, created = Session.objects.update_or_create(
                        erp_id=erp_id,
                        defaults={
                            'name': name,
                            'is_active': True
                        }
                    )
                    synced_ids.append(obj.id)
                
                # Delete local sessions that are no longer in ERP
                Session.objects.filter(erp_id__isnull=False).exclude(id__in=synced_ids).delete()
                
                self.clear_cache()
                return response.Response({"message": f"Successfully synced {len(synced_ids)} sessions"})
            
            return response.Response({"error": f"ERP returned {resp.status_code}"}, status=resp.status_code)
        except Exception as e:
            return response.Response({"error": str(e)}, status=500)

class TargetExamViewSet(CachedListViewSetMixin, viewsets.ModelViewSet):
    queryset = TargetExam.objects.all().order_by('-created_at')
    serializer_class = TargetExamSerializer

    def list(self, request, *args, **kwargs):
        # Auto-sync on list if requested or periodically
        if request.query_params.get('sync') == 'true':
            self.sync_erp(request)
        return super().list(request, *args, **kwargs)

    @action(detail=False, methods=['post'], url_path='sync-erp')
    def sync_erp(self, request):
        """Syncs Exam Tags from ERP to local TargetExam model."""
        try:
            erp_url = _get_erp_url()
            token = _get_erp_admin_token()
            if not token:
                return response.Response({"error": "ERP Token Failed"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            print(f"[ERP-SYNC] Fetching Exam Tags from {erp_url}/api/examTag")
            resp = requests.get(
                f"{erp_url}/api/examTag",
                headers={"Authorization": f"Bearer {token}"},
                timeout=30
            )

            if resp.status_code != 200:
                return response.Response({"error": f"ERP Error: {resp.status_code}"}, status=status.HTTP_400_BAD_REQUEST)

            tags = resp.json()
            if isinstance(tags, dict):
                tags = tags.get('data') or tags.get('tags') or tags.get('examTags') or []
            
            if not isinstance(tags, list):
                # If it's a single object, wrap it
                if isinstance(tags, dict) and tags.get('_id'):
                    tags = [tags]
                else:
                    return response.Response({"error": "Invalid response format from ERP"}, status=status.HTTP_400_BAD_REQUEST)

            synced_ids = []
            for tag_data in tags:
                erp_id = str(tag_data.get('_id'))
                name = tag_data.get('name') or tag_data.get('tagName')
                if not erp_id or not name:
                    continue

                obj, created = TargetExam.objects.update_or_create(
                    erp_id=erp_id,
                    defaults={
                        'name': name,
                        'is_active': True
                    }
                )
                synced_ids.append(obj.id)

            # Remove local tags that are not in ERP
            # WARNING: This may affect related objects if CASCADE is set.
            TargetExam.objects.exclude(id__in=synced_ids).delete()

            self.clear_cache()
            return response.Response({
                "message": f"Successfully synced {len(synced_ids)} tags",
                "count": len(synced_ids)
            }, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"[ERP-SYNC-ERROR] {e}")
            return response.Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ExamTypeViewSet(CachedListViewSetMixin, viewsets.ModelViewSet):
    queryset = ExamType.objects.prefetch_related('target_exams').all().order_by('-created_at')
    serializer_class = ExamTypeSerializer

class ClassLevelViewSet(CachedListViewSetMixin, viewsets.ModelViewSet):
    queryset = ClassLevel.objects.all().order_by('-created_at')
    serializer_class = ClassLevelSerializer

    def list(self, request, *args, **kwargs):
        # Auto-sync on list if requested
        if request.query_params.get('sync') == 'true':
            self.sync_erp(request)
        return super().list(request, *args, **kwargs)

    @action(detail=False, methods=['post'], url_path='sync-erp')
    def sync_erp(self, request):
        """Syncs Class Levels from ERP to local ClassLevel model."""
        try:
            erp_url = _get_erp_url()
            token = _get_erp_admin_token()
            if not token:
                return response.Response({"error": "Failed to get ERP token"}, status=status.HTTP_401_UNAUTHORIZED)

            resp = requests.get(
                f"{erp_url}/api/class",
                headers={"Authorization": f"Bearer {token}"},
                timeout=30
            )

            if resp.status_code == 200:
                erp_classes = resp.json()
                synced_ids = []
                
                for c in erp_classes:
                    erp_id = c.get('_id')
                    name = c.get('name')
                    
                    if not erp_id or not name:
                        continue
                        
                    # Update or create local class
                    obj, created = ClassLevel.objects.update_or_create(
                        erp_id=erp_id,
                        defaults={
                            'name': name,
                            'is_active': True
                        }
                    )
                    synced_ids.append(obj.id)
                
                # Delete local classes that are no longer in ERP
                ClassLevel.objects.filter(erp_id__isnull=False).exclude(id__in=synced_ids).delete()
                
                self.clear_cache()
                return response.Response({"message": f"Successfully synced {len(synced_ids)} classes"})
            
            return response.Response({"error": f"ERP returned {resp.status_code}"}, status=resp.status_code)
        except Exception as e:
            return response.Response({"error": str(e)}, status=500)

class ChapterViewSet(CachedListViewSetMixin, viewsets.ModelViewSet):
    queryset = Chapter.objects.select_related('class_level', 'subject').all().order_by('-created_at')
    serializer_class = ChapterSerializer
    pagination_class = None

    @action(detail=False, methods=['get'])
    def export(self, request):
        queryset = self.get_queryset()
        
        res = HttpResponse(content_type='text/csv')
        res['Content-Disposition'] = 'attachment; filename="chapters_export.csv"'
        
        writer = csv.writer(res)
        writer.writerow(['Name', 'Class Level', 'Subject', 'Code', 'Sort Order', 'Is Active'])
        
        for item in queryset:
            writer.writerow([
                item.name,
                item.class_level.name if item.class_level else '',
                item.subject.name if item.subject else '',
                item.code,
                item.sort_order,
                item.is_active
            ])
        return res

    @action(detail=False, methods=['post'], url_path='bulk-upload')
    def bulk_upload(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return response.Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            raw = file_obj.read()
            decoded_file = None
            used_encoding = None
            for enc in ('utf-8-sig', 'utf-8', 'cp1252', 'latin-1'):
                try:
                    decoded_file = raw.decode(enc)
                    used_encoding = enc
                    break
                except UnicodeDecodeError:
                    continue

            if decoded_file is None:
                decoded_file = raw.decode('latin-1', errors='replace')
                used_encoding = 'latin-1-replace'

            logging.getLogger(__name__).info(f"chapters bulk_upload: decoded file using encoding='{used_encoding}'")
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string)
            
            created_count = 0
            errors = []
            
            for row_idx, row in enumerate(reader, start=2):
                try:
                    name = row.get('Name', '').strip()
                    class_name = row.get('Class Level', '').strip()
                    subject_name = row.get('Subject', '').strip()
                    sort_order = row.get('Sort Order', '1').strip()
                    is_active = str(row.get('Is Active', 'true')).lower() == 'true'
                    
                    if not name or not class_name or not subject_name:
                        if any(row.values()):
                            errors.append(f"Row {row_idx}: Missing required fields (Name, Class Level, or Subject)")
                        continue
                        
                    class_level = ClassLevel.objects.filter(name__iexact=class_name).first()
                    # Fallback heuristics when exact match fails (helps with CSV variations like 'Class 7')
                    if not class_level:
                        # try to match by digit (e.g., 'Class 7' -> '7')
                        digits = re.findall(r"\d+", class_name)
                        if digits:
                            class_level = ClassLevel.objects.filter(name__icontains=digits[0]).first()
                        # try contains match
                        if not class_level:
                            class_level = ClassLevel.objects.filter(name__icontains=class_name).first()

                    subject = Subject.objects.filter(name__iexact=subject_name).first()
                    if not subject:
                        subject = Subject.objects.filter(name__icontains=subject_name).first()
                    
                    if not class_level:
                        errors.append(f"Row {row_idx}: Class '{class_name}' not found")
                        continue
                    if not subject:
                        errors.append(f"Row {row_idx}: Subject '{subject_name}' not found")
                        continue
                        
                    Chapter.objects.create(
                        name=name,
                        class_level=class_level,
                        subject=subject,
                        sort_order=int(sort_order) if sort_order.isdigit() else 1,
                        is_active=is_active
                    )
                    created_count += 1
                except Exception as e:
                    errors.append(f"Row {row_idx}: {str(e)}")
            
            self.clear_cache()
            return response.Response({
                "message": f"Successfully imported {created_count} chapters",
                "errors": errors
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return response.Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ExamDetailViewSet(CachedListViewSetMixin, viewsets.ModelViewSet):
    queryset = ExamDetail.objects.select_related('session', 'exam_type', 'class_level').prefetch_related('target_exams').all().order_by('-created_at')
    serializer_class = ExamDetailSerializer

class SubjectViewSet(CachedListViewSetMixin, viewsets.ModelViewSet):
    queryset = Subject.objects.all().order_by('-created_at')
    serializer_class = SubjectSerializer

class TopicViewSet(CachedListViewSetMixin, viewsets.ModelViewSet):
    queryset = Topic.objects.all()
    serializer_class = TopicSerializer
    pagination_class = None

    def get_queryset(self):
        queryset = Topic.objects.select_related('chapter', 'class_level', 'subject').all().order_by('-created_at')
        chapter_id = self.request.query_params.get('chapter', None)
        if chapter_id:
            queryset = queryset.filter(chapter_id=chapter_id)
        return queryset

    @action(detail=False, methods=['get'])
    def export(self, request):
        queryset = self.get_queryset()
        
        res = HttpResponse(content_type='text/csv')
        res['Content-Disposition'] = 'attachment; filename="topics_export.csv"'
        
        writer = csv.writer(res)
        writer.writerow(['Name', 'Chapter', 'Class Level', 'Subject', 'Code', 'Sort Order', 'Is Active'])
        
        for item in queryset:
            writer.writerow([
                item.name,
                item.chapter.name if item.chapter else '',
                item.class_level.name if item.class_level else '',
                item.subject.name if item.subject else '',
                item.code,
                item.sort_order,
                item.is_active
            ])
        return res

    @action(detail=False, methods=['post'], url_path='bulk-upload')
    def bulk_upload(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return response.Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            raw = file_obj.read()
            decoded_file = None
            used_encoding = None
            for enc in ('utf-8-sig', 'utf-8', 'cp1252', 'latin-1'):
                try:
                    decoded_file = raw.decode(enc)
                    used_encoding = enc
                    break
                except UnicodeDecodeError:
                    continue

            if decoded_file is None:
                decoded_file = raw.decode('latin-1', errors='replace')
                used_encoding = 'latin-1-replace'

            logging.getLogger(__name__).info(f"topics bulk_upload: decoded file using encoding='{used_encoding}'")
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string)
            
            created_count = 0
            errors = []
            
            for row_idx, row in enumerate(reader, start=2):
                try:
                    name = row.get('Name', '').strip()
                    chapter_name = row.get('Chapter', '').strip()
                    class_name = row.get('Class Level', '').strip()
                    subject_name = row.get('Subject', '').strip()
                    sort_order = row.get('Sort Order', '1').strip()
                    is_active = str(row.get('Is Active', 'true')).lower() == 'true'
                    
                    if not name or not class_name or not subject_name:
                        if any(row.values()):
                            errors.append(f"Row {row_idx}: Missing required fields (Name, Class Level, or Subject)")
                        continue
                        
                    class_level = ClassLevel.objects.filter(name__iexact=class_name).first()
                    subject = Subject.objects.filter(name__iexact=subject_name).first()
                    chapter = Chapter.objects.filter(name__iexact=chapter_name, subject=subject, class_level=class_level).first() if chapter_name else None
                    
                    if not class_level:
                        errors.append(f"Row {row_idx}: Class '{class_name}' not found")
                        continue
                    if not subject:
                        errors.append(f"Row {row_idx}: Subject '{subject_name}' not found")
                        continue
                        
                    Topic.objects.create(
                        name=name,
                        chapter=chapter,
                        class_level=class_level,
                        subject=subject,
                        sort_order=int(sort_order) if sort_order.isdigit() else 1,
                        is_active=is_active
                    )
                    created_count += 1
                except Exception as e:
                    errors.append(f"Row {row_idx}: {str(e)}")
            
            self.clear_cache()
            return response.Response({
                "message": f"Successfully imported {created_count} topics",
                "errors": errors
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return response.Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


    def list(self, request, *args, **kwargs):
        # 1. Check for Force Refresh
        force_refresh = request.query_params.get('refresh', 'false').lower() == 'true'
        
        # Only use cache when fetching ALL topics (no filter applied) and NO force refresh
        if not force_refresh and request.query_params.get('chapter'):
            queryset = self.filter_queryset(self.get_queryset())
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            serializer = self.get_serializer(queryset, many=True)
            return response.Response(serializer.data)
            
        return super().list(request, *args, **kwargs)

class SubTopicViewSet(CachedListViewSetMixin, viewsets.ModelViewSet):
    queryset = SubTopic.objects.all()
    serializer_class = SubTopicSerializer
    pagination_class = None

    def get_queryset(self):
        queryset = SubTopic.objects.select_related(
            'topic', 
            'topic__chapter', 
            'topic__class_level', 
            'topic__subject'
        ).all().order_by('-created_at')
        topic_id = self.request.query_params.get('topic', None)
        chapter_id = self.request.query_params.get('chapter', None)
        if topic_id:
            queryset = queryset.filter(topic_id=topic_id)
        elif chapter_id:
            queryset = queryset.filter(topic__chapter_id=chapter_id)
        return queryset

    @action(detail=False, methods=['get'])
    def export(self, request):
        queryset = self.get_queryset()
        
        res = HttpResponse(content_type='text/csv')
        res['Content-Disposition'] = 'attachment; filename="subtopics_export.csv"'
        
        writer = csv.writer(res)
        writer.writerow(['Name', 'Topic', 'Code', 'Sort Order', 'Is Active'])
        
        for item in queryset:
            writer.writerow([
                item.name,
                item.topic.name if item.topic else '',
                item.code,
                item.sort_order,
                item.is_active
            ])
        return res

    @action(detail=False, methods=['post'], url_path='bulk-upload')
    def bulk_upload(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return response.Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            raw = file_obj.read()
            decoded_file = None
            used_encoding = None
            for enc in ('utf-8-sig', 'utf-8', 'cp1252', 'latin-1'):
                try:
                    decoded_file = raw.decode(enc)
                    used_encoding = enc
                    break
                except UnicodeDecodeError:
                    continue

            if decoded_file is None:
                decoded_file = raw.decode('latin-1', errors='replace')
                used_encoding = 'latin-1-replace'

            logging.getLogger(__name__).info(f"subtopics bulk_upload: decoded file using encoding='{used_encoding}'")
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string)
            
            created_count = 0
            errors = []
            
            for row_idx, row in enumerate(reader, start=2):
                try:
                    name = row.get('Name', '').strip()
                    topic_name = row.get('Topic', '').strip()
                    sort_order = row.get('Sort Order', '1').strip()
                    is_active = str(row.get('Is Active', 'true')).lower() == 'true'
                    
                    if not name or not topic_name:
                        if any(row.values()):
                            errors.append(f"Row {row_idx}: Missing required fields (Name or Topic)")
                        continue
                        
                    topic = Topic.objects.filter(name__iexact=topic_name).first()
                    
                    if not topic:
                        errors.append(f"Row {row_idx}: Topic '{topic_name}' not found")
                        continue
                        
                    SubTopic.objects.create(
                        name=name,
                        topic=topic,
                        sort_order=int(sort_order) if sort_order.isdigit() else 1,
                        is_active=is_active
                    )
                    created_count += 1
                except Exception as e:
                    errors.append(f"Row {row_idx}: {str(e)}")
            
            self.clear_cache()
            return response.Response({
                "message": f"Successfully imported {created_count} sub-topics",
                "errors": errors
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return response.Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


    def list(self, request, *args, **kwargs):
        # 1. Check for Force Refresh
        force_refresh = request.query_params.get('refresh', 'false').lower() == 'true'
        
        # Only use cache when fetching ALL subtopics (no filter applied) and NO force refresh
        if not force_refresh and (request.query_params.get('topic') or request.query_params.get('chapter')):
            queryset = self.filter_queryset(self.get_queryset())
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            serializer = self.get_serializer(queryset, many=True)
            return response.Response(serializer.data)
            
        return super().list(request, *args, **kwargs)

class TeacherViewSet(CachedListViewSetMixin, viewsets.ModelViewSet):
    queryset = Teacher.objects.select_related('subject').all().order_by('-created_at')
    serializer_class = TeacherSerializer

class LibraryItemViewSet(CachedListViewSetMixin, StudentSectionFilterMixin, viewsets.ModelViewSet):
    queryset = LibraryItem.objects.all()
    serializer_class = LibraryItemSerializer
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        queryset = LibraryItem.objects.select_related(
            'session', 'class_level', 'subject', 'chapter', 'topic', 
            'exam_type', 'target_exam', 'section'
        ).prefetch_related(
            'pdfs', 'videos', 'dpps', 'questions'
        ).all().order_by('-created_at')
        return self.filter_by_section(queryset, 'section')

    def perform_create(self, serializer):
        item = serializer.save()
        self.handle_multi_files(item)
        self.clear_cache()
        
    def perform_update(self, serializer):
        item = serializer.save()
        self.handle_multi_files(item)
        self.clear_cache()

    def handle_multi_files(self, item):
        import json
        request = self.request
        
        # 1. Handle PDFs with individual thumbnails, titles, and descriptions
        pdfs = request.FILES.getlist('multi_pdfs')
        for i, f in enumerate(pdfs):
            thumb = request.FILES.get(f'pdf_{i}_thumb')
            title = request.data.get(f'pdf_{i}_title')
            desc = request.data.get(f'pdf_{i}_desc')
            LibraryPDF.objects.create(
                library_item=item, 
                file=f, 
                thumbnail=thumb,
                title=title if title else f.name,
                description=desc
            )
            
        # 2. Handle Video Files with individual details
        videos = request.FILES.getlist('multi_videos')
        for i, f in enumerate(videos):
            thumb = request.FILES.get(f'video_{i}_thumb')
            title = request.data.get(f'video_{i}_title')
            desc = request.data.get(f'video_{i}_desc')
            LibraryVideo.objects.create(
                library_item=item, 
                video_file=f, 
                thumbnail=thumb,
                title=title if title else f.name,
                description=desc
            )
            
        # 3. Handle Video Links with individual details
        links_data = request.data.get('multi_video_links_data', '[]')
        try:
            links = json.loads(links_data)
            for i, v in enumerate(links):
                link_url = v.get('link')
                if link_url and str(link_url).strip():
                    thumb = request.FILES.get(f'link_{i}_thumb')
                    LibraryVideo.objects.create(
                        library_item=item, 
                        video_link=link_url.strip(), 
                        thumbnail=thumb,
                        title=v.get('name') or f"Video Link {i+1}",
                        description=v.get('description')
                    )
        except Exception as e:
            print(f"Error processing video links: {e}")
            pass

        # 4. Handle multiple DPPs
        dpps = request.FILES.getlist('multi_dpps')
        for i, f in enumerate(dpps):
            thumb = request.FILES.get(f'dpp_{i}_thumb')
            title = request.data.get(f'dpp_{i}_title')
            desc = request.data.get(f'dpp_{i}_desc')
            LibraryDPP.objects.create(
                library_item=item,
                file=f,
                thumbnail=thumb,
                title=title if title else f.name,
                description=desc
            )

class SolutionItemViewSet(CachedListViewSetMixin, StudentSectionFilterMixin, viewsets.ModelViewSet):
    queryset = SolutionItem.objects.all()
    serializer_class = SolutionItemSerializer
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = SolutionItem.objects.select_related(
            'session', 'class_level', 'subject', 'exam_type', 'target_exam'
        ).prefetch_related('sections').all().order_by('-created_at')
        return self.filter_by_section(queryset, 'sections')

class NoticeViewSet(CachedListViewSetMixin, StudentSectionFilterMixin, viewsets.ModelViewSet):
    queryset = Notice.objects.all()
    serializer_class = NoticeSerializer
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        queryset = Notice.objects.select_related(
            'session', 'class_level', 'subject', 'exam_type', 'target_exam', 'section'
        ).all().order_by('-created_at')
        return self.filter_by_section(queryset, 'section')

class LiveClassViewSet(CachedListViewSetMixin, StudentSectionFilterMixin, viewsets.ModelViewSet):
    queryset = LiveClass.objects.all()
    serializer_class = LiveClassSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = LiveClass.objects.select_related(
            'session', 'class_level', 'subject', 'exam_type', 'target_exam', 'section'
        ).prefetch_related('packages').all().order_by('-created_at')
        return self.filter_by_section(queryset, 'section')

class VideoViewSet(CachedListViewSetMixin, StudentSectionFilterMixin, viewsets.ModelViewSet):
    queryset = Video.objects.all()
    serializer_class = VideoSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        queryset = Video.objects.select_related(
            'session', 'class_level', 'subject', 'exam_type', 'target_exam', 'section'
        ).prefetch_related('packages').all().order_by('-created_at')
        return self.filter_by_section(queryset, 'section')

class PenPaperTestViewSet(CachedListViewSetMixin, StudentSectionFilterMixin, viewsets.ModelViewSet):
    queryset = PenPaperTest.objects.all()
    serializer_class = PenPaperTestSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        queryset = PenPaperTest.objects.select_related(
            'session', 'class_level', 'subject', 'exam_type', 'target_exam'
        ).prefetch_related('packages', 'sections').all().order_by('-created_at')
        return self.filter_by_section(queryset, 'sections')

class HomeworkViewSet(CachedListViewSetMixin, StudentSectionFilterMixin, viewsets.ModelViewSet):
    queryset = Homework.objects.all()
    serializer_class = HomeworkSerializer
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        queryset = Homework.objects.select_related(
            'session', 'class_level', 'subject', 'exam_type', 'target_exam'
        ).prefetch_related('sections', 'packages').all().order_by('-created_at')
        return self.filter_by_section(queryset, 'sections')

class BannerViewSet(viewsets.ModelViewSet):
    queryset = Banner.objects.all().order_by('-created_at')
    serializer_class = BannerSerializer
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [permissions.AllowAny]

class SeminarViewSet(viewsets.ModelViewSet):
    queryset = Seminar.objects.all().order_by('-date_time')
    serializer_class = SeminarSerializer
    permission_classes = [permissions.AllowAny]

class GuideViewSet(viewsets.ModelViewSet):
    queryset = Guide.objects.all().order_by('-created_at')
    serializer_class = GuideSerializer
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [permissions.AllowAny]

class CommunityViewSet(viewsets.ModelViewSet):
    queryset = Community.objects.all().order_by('-created_at')
    serializer_class = CommunitySerializer
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [permissions.AllowAny]
