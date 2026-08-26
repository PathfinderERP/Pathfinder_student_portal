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
from .models import Session, TargetExam, ExamType, ClassLevel, ExamDetail, Subject, Topic, Chapter, SubTopic, Teacher, LibraryItem, LibraryPDF, LibraryVideo, LibraryDPP, SolutionItem, Notice, LiveClass, Video, PenPaperTest, Homework, Banner, Seminar, Guide, Community, MasterSection, PartialMarkRule, PsychometricTrait, PsychometricQuestion, MistakeReason, ChapterTestSetting, generate_unique_code
from .serializers import SessionSerializer, TargetExamSerializer, ExamTypeSerializer, ClassLevelSerializer, ExamDetailSerializer, SubjectSerializer, TopicSerializer, ChapterSerializer, SubTopicSerializer, TeacherSerializer, LibraryItemSerializer, SolutionItemSerializer, NoticeSerializer, LiveClassSerializer, VideoSerializer, PenPaperTestSerializer, HomeworkSerializer, BannerSerializer, SeminarSerializer, GuideSerializer, CommunitySerializer, MasterSectionSerializer, PartialMarkRuleSerializer, PsychometricTraitSerializer, PsychometricQuestionSerializer, MistakeReasonSerializer, ChapterTestSettingSerializer

class StandardPagination(pagination.PageNumberPagination):
    page_size = 20
from django.db.models import Q, Count
from django.core.cache import cache
import re
import pandas as pd

def clean_val(val):
    if val is None or pd.isna(val):
        return ''
    if isinstance(val, float) and val.is_integer():
        return str(int(val)).strip()
    s = str(val).strip()
    if s.lower() in ('nan', 'none', 'null', '<na>'):
        return ''
    return s

def resolve_class_level(class_name):
    if not class_name:
        return None
    class_name = clean_val(class_name)
    # 1. Exact match (case insensitive)
    cl = ClassLevel.objects.filter(name__iexact=class_name).first()
    if cl: return cl
    # 2. Extract digits if any (e.g. "Class 11", "11th", "Class-12", "11.0")
    digits = re.findall(r"\d+", class_name)
    if digits:
        cl = ClassLevel.objects.filter(name__iexact=digits[0]).first()
        if cl: return cl
        cl = ClassLevel.objects.filter(name__icontains=digits[0]).first()
        if cl: return cl
    # 3. Clean alphanumeric string match (e.g. "repeater", "taat a")
    clean_str = re.sub(r'[^a-zA-Z0-9]', '', class_name).lower()
    for item in ClassLevel.objects.all():
        if re.sub(r'[^a-zA-Z0-9]', '', item.name).lower() == clean_str:
            return item
    return ClassLevel.objects.filter(name__icontains=class_name).first()

def resolve_subject(subject_name):
    if not subject_name:
        return None
    subject_name = clean_val(subject_name)
    # 1. Exact match (case insensitive)
    sub = Subject.objects.filter(name__iexact=subject_name).first()
    if sub: return sub
    # 2. Code match
    sub = Subject.objects.filter(code__iexact=subject_name).first()
    if sub: return sub
    # 3. Normalized alias match
    sub_clean = re.sub(r'[^a-zA-Z0-9]', '', subject_name).lower()
    alias_map = {
        'math': 'MATHEMATICS', 'maths': 'MATHEMATICS', 'mathematics': 'MATHEMATICS',
        'phy': 'PHYSICS', 'phys': 'PHYSICS', 'physics': 'PHYSICS',
        'chem': 'CHEMISTRY', 'che': 'CHEMISTRY', 'chemistry': 'CHEMISTRY',
        'bio': 'BIOLOGY', 'biology': 'BIOLOGY',
        'bot': 'BOTANY', 'botany': 'BOTANY',
        'zoo': 'ZOOLOGY', 'zoology': 'ZOOLOGY',
    }
    if sub_clean in alias_map:
        sub = Subject.objects.filter(name__iexact=alias_map[sub_clean]).first()
        if sub: return sub
    for item in Subject.objects.all():
        if re.sub(r'[^a-zA-Z0-9]', '', item.name).lower() == sub_clean:
            return item
    return Subject.objects.filter(name__icontains=subject_name).first()

def find_existing_chapter(clean_name, class_level, subject):
    if not clean_name or not class_level or not subject:
        return None
    # 1. Direct exact match
    ch = Chapter.objects.filter(name=clean_name, class_level=class_level, subject=subject).first()
    if ch: return ch
    # 2. Case and whitespace/punctuation normalized search (immune to Djongo regex bugs)
    clean_lower = clean_name.lower().strip()
    norm_name = re.sub(r'[^a-zA-Z0-9]', '', clean_name).lower()
    for item in Chapter.objects.filter(class_level=class_level, subject=subject):
        if item.name.lower().strip() == clean_lower or re.sub(r'[^a-zA-Z0-9]', '', item.name).lower() == norm_name:
            return item
    return None

def find_existing_topic(clean_name, class_level, subject, chapter=None):
    if not clean_name or not class_level or not subject:
        return None
    if chapter:
        t = Topic.objects.filter(name=clean_name, chapter=chapter, class_level=class_level, subject=subject).first()
        if t: return t
    t = Topic.objects.filter(name=clean_name, class_level=class_level, subject=subject).first()
    if t: return t
    clean_lower = clean_name.lower().strip()
    norm_name = re.sub(r'[^a-zA-Z0-9]', '', clean_name).lower()
    qs = Topic.objects.filter(class_level=class_level, subject=subject)
    if chapter:
        for item in qs.filter(chapter=chapter):
            if item.name.lower().strip() == clean_lower or re.sub(r'[^a-zA-Z0-9]', '', item.name).lower() == norm_name:
                return item
    for item in qs:
        if item.name.lower().strip() == clean_lower or re.sub(r'[^a-zA-Z0-9]', '', item.name).lower() == norm_name:
            return item
    return None

def find_existing_subtopic(clean_name, topic):
    if not clean_name or not topic:
        return None
    st = SubTopic.objects.filter(name=clean_name, topic=topic).first()
    if st: return st
    clean_lower = clean_name.lower().strip()
    norm_name = re.sub(r'[^a-zA-Z0-9]', '', clean_name).lower()
    for item in SubTopic.objects.filter(topic=topic):
        if item.name.lower().strip() == clean_lower or re.sub(r'[^a-zA-Z0-9]', '', item.name).lower() == norm_name:
            return item
    return None

class BulkImportCache:
    """High-performance pre-loaded in-memory cache and index for batch imports."""
    def __init__(self, model_class):
        self.model_class = model_class
        
        # 1. Preload all ClassLevels
        self.class_levels = list(ClassLevel.objects.all())
        self.class_map = {}
        for cl in self.class_levels:
            self.class_map[cl.name.lower().strip()] = cl
            norm = re.sub(r'[^a-zA-Z0-9]', '', cl.name).lower()
            if norm: self.class_map[norm] = cl
            digits = re.findall(r'\d+', cl.name)
            if digits and digits[0] not in self.class_map:
                self.class_map[digits[0]] = cl

        # 2. Preload all Subjects
        self.subjects = list(Subject.objects.all())
        self.subject_map = {}
        alias_map = {
            'math': 'MATHEMATICS', 'maths': 'MATHEMATICS', 'mathematics': 'MATHEMATICS',
            'phy': 'PHYSICS', 'phys': 'PHYSICS', 'physics': 'PHYSICS',
            'chem': 'CHEMISTRY', 'che': 'CHEMISTRY', 'chemistry': 'CHEMISTRY',
            'bio': 'BIOLOGY', 'biology': 'BIOLOGY',
            'bot': 'BOTANY', 'botany': 'BOTANY',
            'zoo': 'ZOOLOGY', 'zoology': 'ZOOLOGY',
        }
        for sub in self.subjects:
            self.subject_map[sub.name.lower().strip()] = sub
            if sub.code:
                self.subject_map[sub.code.lower().strip()] = sub
            norm = re.sub(r'[^a-zA-Z0-9]', '', sub.name).lower()
            if norm: self.subject_map[norm] = sub
        for alias_key, target_name in alias_map.items():
            for sub in self.subjects:
                if sub.name.upper() == target_name:
                    self.subject_map[alias_key] = sub
                    break

        # 3. Preload all Chapters
        self.chapters = list(Chapter.objects.all())
        self.chapter_map = {}
        for ch in self.chapters:
            norm = re.sub(r'[^a-zA-Z0-9]', '', ch.name).lower()
            lower = ch.name.lower().strip()
            self.chapter_map[(ch.class_level_id, ch.subject_id, lower)] = ch
            self.chapter_map[(ch.class_level_id, ch.subject_id, norm)] = ch
            self.chapter_map[(ch.subject_id, lower)] = ch
            self.chapter_map[(ch.subject_id, norm)] = ch

        # 4. Preload all Topics
        self.topics = list(Topic.objects.all())
        self.topic_map = {}
        for t in self.topics:
            norm = re.sub(r'[^a-zA-Z0-9]', '', t.name).lower()
            lower = t.name.lower().strip()
            if t.chapter_id:
                self.topic_map[(t.class_level_id, t.subject_id, t.chapter_id, lower)] = t
                self.topic_map[(t.class_level_id, t.subject_id, t.chapter_id, norm)] = t
            self.topic_map[(t.class_level_id, t.subject_id, lower)] = t
            self.topic_map[(t.class_level_id, t.subject_id, norm)] = t
            self.topic_map[lower] = t
            self.topic_map[norm] = t

        # 5. Preload all SubTopics
        self.subtopics = list(SubTopic.objects.all())
        self.subtopic_map = {}
        for st in self.subtopics:
            norm = re.sub(r'[^a-zA-Z0-9]', '', st.name).lower()
            lower = st.name.lower().strip()
            self.subtopic_map[(st.topic_id, lower)] = st
            self.subtopic_map[(st.topic_id, norm)] = st

        # 6. Preload all existing codes for collision-free in-memory code generation
        self.existing_codes = set(model_class.objects.values_list('code', flat=True))

    def resolve_class(self, class_name):
        if not class_name: return None
        clean = clean_val(class_name)
        lower = clean.lower().strip()
        if lower in self.class_map: return self.class_map[lower]
        norm = re.sub(r'[^a-zA-Z0-9]', '', clean).lower()
        if norm in self.class_map: return self.class_map[norm]
        digits = re.findall(r'\d+', clean)
        if digits and digits[0] in self.class_map: return self.class_map[digits[0]]
        for cl in self.class_levels:
            if clean.lower() in cl.name.lower(): return cl
        return None

    def resolve_sub(self, subject_name):
        if not subject_name: return None
        clean = clean_val(subject_name)
        lower = clean.lower().strip()
        if lower in self.subject_map: return self.subject_map[lower]
        norm = re.sub(r'[^a-zA-Z0-9]', '', clean).lower()
        if norm in self.subject_map: return self.subject_map[norm]
        for sub in self.subjects:
            if clean.lower() in sub.name.lower(): return sub
        return None

    def find_chapter(self, chapter_name, class_level, subject):
        if not chapter_name or not subject: return None
        clean = re.sub(r'\s+', ' ', str(chapter_name).strip())
        lower = clean.lower()
        norm = re.sub(r'[^a-zA-Z0-9]', '', clean).lower()
        if class_level:
            if (class_level.id, subject.id, lower) in self.chapter_map:
                return self.chapter_map[(class_level.id, subject.id, lower)]
            if (class_level.id, subject.id, norm) in self.chapter_map:
                return self.chapter_map[(class_level.id, subject.id, norm)]
        if (subject.id, lower) in self.chapter_map:
            return self.chapter_map[(subject.id, lower)]
        if (subject.id, norm) in self.chapter_map:
            return self.chapter_map[(subject.id, norm)]
        for ch in self.chapters:
            if ch.subject_id == subject.id and clean.lower() in ch.name.lower():
                return ch
        return None

    def find_topic(self, topic_name, class_level, subject, chapter=None):
        if not topic_name or not class_level or not subject: return None
        clean = re.sub(r'\s+', ' ', str(topic_name).strip())
        lower = clean.lower()
        norm = re.sub(r'[^a-zA-Z0-9]', '', clean).lower()
        if chapter:
            if (class_level.id, subject.id, chapter.id, lower) in self.topic_map:
                return self.topic_map[(class_level.id, subject.id, chapter.id, lower)]
            if (class_level.id, subject.id, chapter.id, norm) in self.topic_map:
                return self.topic_map[(class_level.id, subject.id, chapter.id, norm)]
        if (class_level.id, subject.id, lower) in self.topic_map:
            return self.topic_map[(class_level.id, subject.id, lower)]
        if (class_level.id, subject.id, norm) in self.topic_map:
            return self.topic_map[(class_level.id, subject.id, norm)]
        return None

    def find_subtopic(self, subtopic_name, topic):
        if not subtopic_name or not topic: return None
        clean = re.sub(r'\s+', ' ', str(subtopic_name).strip())
        lower = clean.lower()
        norm = re.sub(r'[^a-zA-Z0-9]', '', clean).lower()
        if (topic.id, lower) in self.subtopic_map:
            return self.subtopic_map[(topic.id, lower)]
        if (topic.id, norm) in self.subtopic_map:
            return self.subtopic_map[(topic.id, norm)]
        return None

    def generate_code(self, base_name):
        clean_base = re.sub(r'[^a-zA-Z0-9]', '', str(base_name)).upper()
        if not clean_base: clean_base = "ITEM"
        clean_base = clean_base[:4]
        code = clean_base
        counter = 1
        while code in self.existing_codes:
            code = f"{clean_base}{counter}"
            counter += 1
        self.existing_codes.add(code)
        return code

    def register_chapter(self, ch):
        norm = re.sub(r'[^a-zA-Z0-9]', '', ch.name).lower()
        lower = ch.name.lower().strip()
        self.chapter_map[(ch.class_level_id, ch.subject_id, lower)] = ch
        self.chapter_map[(ch.class_level_id, ch.subject_id, norm)] = ch
        self.chapter_map[(ch.subject_id, lower)] = ch
        self.chapter_map[(ch.subject_id, norm)] = ch
        self.chapters.append(ch)

    def register_topic(self, t):
        norm = re.sub(r'[^a-zA-Z0-9]', '', t.name).lower()
        lower = t.name.lower().strip()
        if t.chapter_id:
            self.topic_map[(t.class_level_id, t.subject_id, t.chapter_id, lower)] = t
            self.topic_map[(t.class_level_id, t.subject_id, t.chapter_id, norm)] = t
        self.topic_map[(t.class_level_id, t.subject_id, lower)] = t
        self.topic_map[(t.class_level_id, t.subject_id, norm)] = t
        self.topics.append(t)

    def register_subtopic(self, st):
        norm = re.sub(r'[^a-zA-Z0-9]', '', st.name).lower()
        lower = st.name.lower().strip()
        self.subtopic_map[(st.topic_id, lower)] = st
        self.subtopic_map[(st.topic_id, norm)] = st
        self.subtopics.append(st)

def parse_tabular_file(file_obj):
    """
    Parses an uploaded CSV or Excel (.xlsx, .xls) file into a list of (row_idx, row_dict).
    Handles encoding variations, blank rows, numeric types, and case/whitespace variations in header names.
    """
    filename = (file_obj.name or '').lower()
    records = []
    
    if filename.endswith(('.xlsx', '.xls')):
        try:
            df = pd.read_excel(file_obj)
            headers = [clean_val(c) for c in df.columns]
            for idx, row in df.iterrows():
                row_dict = {}
                for col_idx, col_name in enumerate(headers):
                    if not col_name: continue
                    val = row.iloc[col_idx]
                    row_dict[col_name] = clean_val(val)
                if any(v != '' for v in row_dict.values()):
                    records.append((idx + 2, row_dict))
        except Exception as e:
            logging.getLogger(__name__).error(f"Excel read error: {e}")
            raise ValueError(f"Failed to read Excel file: {str(e)}")
    else:
        raw = file_obj.read()
        decoded_file = None
        for enc in ('utf-8-sig', 'utf-8', 'cp1252', 'latin-1'):
            try:
                decoded_file = raw.decode(enc)
                break
            except UnicodeDecodeError:
                continue
        if decoded_file is None:
            decoded_file = raw.decode('latin-1', errors='replace')
            
        io_string = io.StringIO(decoded_file)
        reader = csv.DictReader(io_string)
        if reader.fieldnames:
            reader.fieldnames = [clean_val(f) for f in reader.fieldnames]
            
        for row_idx, row in enumerate(reader, start=2):
            if not row:
                continue
            row_dict = {clean_val(k): clean_val(v) for k, v in row.items() if k is not None}
            if any(v != '' for v in row_dict.values()):
                records.append((row_idx, row_dict))
                
    return records

def get_field_case_insensitive(row_dict, field_names, default=''):
    """
    Extracts value from row_dict matching any alias in field_names (case & separator insensitive).
    """
    for key in row_dict:
        clean_key = key.lower().replace('_', '').replace(' ', '').replace('-', '')
        for fn in field_names:
            if clean_key == fn.lower().replace('_', '').replace(' ', '').replace('-', ''):
                return row_dict[key]
    return default

class StudentSectionFilterMixin:
    """
    Mixin to filter querysets based on student's Session, Class Level, and Target Exam.
    Replaces legacy section-based filtering.
    """
    def filter_by_section(self, queryset, section_field='section'):
        user = self.request.user
        # Staff/Admin see everything
        if user.is_staff or user.is_superuser or getattr(user, 'user_type', None) != 'student':
            return queryset
            
        filter_q = Q()
        
        # 1. Session Filtering
        if hasattr(queryset.model, 'sessions') or hasattr(queryset.model, 'session'):
            pass
            # session_q = Q()
            # if hasattr(user, 'session') and user.session:
            #     if hasattr(queryset.model, 'sessions'):
            #         session_q |= Q(sessions=user.session)
            #     if hasattr(queryset.model, 'session'):
            #         session_q |= Q(session=user.session)
            # 
            # # If item has NO session assigned, it's global
            # no_session_q = Q()
            # if hasattr(queryset.model, 'sessions'):
            #     no_session_q &= Q(sessions__isnull=True)
            # if hasattr(queryset.model, 'session'):
            #     no_session_q &= Q(session__isnull=True)
            # 
            # filter_q &= (session_q | no_session_q)

        # 2. Class Level Filtering
        if hasattr(queryset.model, 'class_levels') or hasattr(queryset.model, 'class_level'):
            class_q = Q()
            
            if hasattr(queryset.model, 'class_levels'):
                class_q |= Q(class_levels__isnull=True)
            if hasattr(queryset.model, 'class_level'):
                class_q |= Q(class_level__isnull=True)
                
            if hasattr(user, 'class_level') and user.class_level:
                if hasattr(queryset.model, 'class_levels'):
                    class_q |= Q(class_levels=user.class_level)
                if hasattr(queryset.model, 'class_level'):
                    class_q |= Q(class_level=user.class_level)
                    
            filter_q &= class_q

        # 3. Target Exam Filtering
        if hasattr(queryset.model, 'target_exams') or hasattr(queryset.model, 'target_exam'):
            te_q = Q()
            # Default: visible if no target exam is set
            if hasattr(queryset.model, 'target_exams'):
                te_q |= Q(target_exams__isnull=True)
            if hasattr(queryset.model, 'target_exam'):
                te_q |= Q(target_exam__isnull=True)
            
            if hasattr(user, 'target_exam') and user.target_exam:
                if hasattr(queryset.model, 'target_exams'):
                    te_q |= Q(target_exams=user.target_exam)
                if hasattr(queryset.model, 'target_exam'):
                    te_q |= Q(target_exam=user.target_exam)
            
            filter_q &= te_q

        return queryset.filter(filter_q).distinct()

def deep_serialize(data):
    """Recursively convert DRF ReturnList / OrderedDict / ReturnDict to plain Python
    types (list / dict) so they can be safely pickled into Redis or any cache backend."""
    if isinstance(data, dict):
        return {k: deep_serialize(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [deep_serialize(item) for item in data]
    return data

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
        
        # If this viewset uses StudentSectionFilterMixin, we must include the targeting in the cache key
        if isinstance(self, StudentSectionFilterMixin) and user.is_authenticated:
            # Normalize targeting params for the cache key
            te = str(getattr(user, 'target_exam_id', getattr(user, 'target_exam', 'none'))).lower()
            cl = str(getattr(user, 'class_level_id', getattr(user, 'class_level', 'none'))).lower()
            sess = str(getattr(user, 'session_id', getattr(user, 'session', 'none'))).lower()
            return f"{base_key}_TE{te}_CL{cl}_S{sess}"
            
        return base_key

    def list(self, request, *args, **kwargs):
        # 1. Check for Force Refresh (Frontend requested bypass)
        force_refresh = request.query_params.get('refresh', 'false').lower() == 'true'
        cache_key = self.get_cache_key()
        now = time.time()

        if force_refresh:
            print(f"⚡ Force Refresh: Bypassing cache for {self.__class__.__name__}")
            res = super(CachedListViewSetMixin, self).list(request, *args, **kwargs)
            
            # Deep-convert all nested DRF types to plain Python before caching in Redis
            data_to_cache = deep_serialize(res.data)
            
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
        
        # Deep-convert all nested DRF types to plain Python before caching in Redis
        data_to_cache = deep_serialize(res.data)

        cache.set(cache_key, data_to_cache, timeout=timeout)
        
        # Populate local cache
        self.__class__._local_cache[cache_key] = {'data': data_to_cache, 'time': now}
        res.data = data_to_cache
        return res

    def perform_create(self, serializer):
        user_str = str(self.request.user.email or self.request.user.username or 'Admin') if self.request.user and self.request.user.is_authenticated else 'Admin'
        save_kwargs = {}
        if hasattr(serializer.Meta.model, 'created_by'):
            save_kwargs['created_by'] = user_str
        if hasattr(serializer.Meta.model, 'updated_by'):
            save_kwargs['updated_by'] = user_str
        serializer.save(**save_kwargs)
        self.clear_cache()

    def perform_update(self, serializer):
        user_str = str(self.request.user.email or self.request.user.username or 'Admin') if self.request.user and self.request.user.is_authenticated else 'Admin'
        save_kwargs = {}
        if hasattr(serializer.Meta.model, 'updated_by'):
            save_kwargs['updated_by'] = user_str
        serializer.save(**save_kwargs)
        self.clear_cache()

    def perform_destroy(self, instance):
        instance.delete()
        self.clear_cache()

    @action(detail=False, methods=['post'], url_path='bulk-update')
    def bulk_update(self, request):
        ids = request.data.get('ids', [])
        updates = request.data.get('updates', {})
        items = request.data.get('items', [])

        if not ids and not items:
            return response.Response({"error": "No ids or items provided for bulk update"}, status=status.HTTP_400_BAD_REQUEST)

        model = self.get_queryset().model
        updated_count = 0

        if ids and updates:
            valid_fields = [f.name for f in model._meta.get_fields() if not f.is_relation or f.many_to_one or f.one_to_one]
            filtered_updates = {}
            for k, v in updates.items():
                if k in valid_fields:
                    filtered_updates[k] = v
                elif f"{k}_id" in valid_fields:
                    filtered_updates[f"{k}_id"] = v

            if filtered_updates:
                updated_count = model.objects.filter(id__in=ids).update(**filtered_updates)

        elif items:
            valid_fields = [f.name for f in model._meta.get_fields() if not f.is_relation or f.many_to_one or f.one_to_one]
            for item_data in items:
                item_id = item_data.get('id')
                if not item_id:
                    continue
                item_updates = {k: v for k, v in item_data.items() if k != 'id'}
                filtered_updates = {}
                for k, v in item_updates.items():
                    if k in valid_fields:
                        filtered_updates[k] = v
                    elif f"{k}_id" in valid_fields:
                        filtered_updates[f"{k}_id"] = v
                if filtered_updates:
                    updated_count += model.objects.filter(id=item_id).update(**filtered_updates)

        self.clear_cache()
        return response.Response({
            "message": f"Successfully updated {updated_count} record(s)",
            "updated_count": updated_count
        })

    @action(detail=False, methods=['post'], url_path='bulk-delete')
    def bulk_delete(self, request):
        ids = request.data.get('ids', [])
        if not ids:
            return response.Response({"error": "No ids provided for bulk delete"}, status=status.HTTP_400_BAD_REQUEST)

        model = self.get_queryset().model
        deleted_count, _ = model.objects.filter(id__in=ids).delete()
        self.clear_cache()
        return response.Response({
            "message": f"Successfully deleted {deleted_count} record(s)",
            "deleted_count": deleted_count
        })

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

class PartialMarkRuleViewSet(CachedListViewSetMixin, viewsets.ModelViewSet):
    queryset = PartialMarkRule.objects.all().order_by('-created_at')
    serializer_class = PartialMarkRuleSerializer
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
                            'is_active': s.get('isGlobalActive', s.get('isActive', True))
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
                        'is_active': tag_data.get('isGlobalActive', tag_data.get('isActive', True))
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
                            'is_active': c.get('isGlobalActive', c.get('isActive', True))
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
            records = parse_tabular_file(file_obj)
            if not records:
                return response.Response({"error": "Uploaded file contains no data rows"}, status=status.HTTP_400_BAD_REQUEST)

            mode = request.data.get('mode', 'skip_existing').lower() # 'skip_existing', 'upsert', 'create', 'update'
            
            created_count = 0
            updated_count = 0
            skipped_count = 0
            errors = []
            
            created_items = []
            updated_items = []
            skipped_items = []
            error_items = []
            details = []
            user_str = str(request.user.email or request.user.username or 'Admin') if request.user and request.user.is_authenticated else 'Bulk Import'
            cache = BulkImportCache(Chapter)

            for row_idx, row in records:
                try:
                    name = get_field_case_insensitive(row, ['Name', 'Chapter Name', 'Chapter', 'Title', 'ChapterName'])
                    class_name = get_field_case_insensitive(row, ['Class Level', 'Class', 'ClassLevel', 'Class_Level'])
                    subject_name = get_field_case_insensitive(row, ['Subject', 'Subject Name', 'SubjectName', 'Subject_Name'])
                    code = get_field_case_insensitive(row, ['Code', 'Chapter Code', 'ChapterCode'])
                    sort_order_str = get_field_case_insensitive(row, ['Sort Order', 'Order', 'SortOrder'], '1')
                    is_active_str = get_field_case_insensitive(row, ['Is Active', 'Active', 'Status', 'IsActive'], 'true')
                    is_active = str(is_active_str).lower() in ('true', '1', 'yes', 'active')
                    
                    sort_order = 1
                    try:
                        sort_order = int(float(sort_order_str)) if sort_order_str else 1
                    except (ValueError, TypeError):
                        sort_order = 1
                    
                    if not name or not class_name or not subject_name:
                        err_msg = f"Row {row_idx}: Missing required fields (Name='{name}', Class='{class_name}', or Subject='{subject_name}')"
                        errors.append(err_msg)
                        error_items.append({'row': row_idx, 'name': name or 'N/A', 'error': err_msg})
                        details.append({'row': row_idx, 'name': name or 'N/A', 'class_level': class_name, 'subject': subject_name, 'status': 'error', 'message': err_msg})
                        continue
                        
                    class_level = cache.resolve_class(class_name)
                    subject = cache.resolve_sub(subject_name)
                    
                    if not class_level:
                        err_msg = f"Row {row_idx}: Class '{class_name}' not found in system"
                        errors.append(err_msg)
                        error_items.append({'row': row_idx, 'name': name, 'error': err_msg})
                        details.append({'row': row_idx, 'name': name, 'class_level': class_name, 'subject': subject_name, 'status': 'error', 'message': err_msg})
                        continue
                    if not subject:
                        err_msg = f"Row {row_idx}: Subject '{subject_name}' not found in system"
                        errors.append(err_msg)
                        error_items.append({'row': row_idx, 'name': name, 'error': err_msg})
                        details.append({'row': row_idx, 'name': name, 'class_level': class_level.name, 'subject': subject_name, 'status': 'error', 'message': err_msg})
                        continue
                    
                    clean_name = re.sub(r'\s+', ' ', name.strip())
                    clean_code = code.strip() if code else ''

                    # In-memory instant duplicate lookup (O(1))
                    existing_chapter = cache.find_chapter(clean_name, class_level, subject)

                    if existing_chapter:
                        if mode in ('skip_existing', 'skip'):
                            skipped_count += 1
                            skip_msg = f"Chapter '{existing_chapter.name}' already exists (Class: {class_level.name}, Subject: {subject.name})"
                            skipped_items.append({'row': row_idx, 'name': clean_name, 'class_level': class_level.name, 'subject': subject.name, 'reason': skip_msg})
                            details.append({'row': row_idx, 'name': clean_name, 'class_level': class_level.name, 'subject': subject.name, 'status': 'skipped', 'message': skip_msg})
                        elif mode in ('update', 'upsert'):
                            existing_chapter.name = clean_name
                            existing_chapter.class_level = class_level
                            existing_chapter.subject = subject
                            if clean_code:
                                existing_chapter.code = clean_code
                            existing_chapter.sort_order = sort_order
                            existing_chapter.is_active = is_active
                            existing_chapter.updated_by = user_str
                            existing_chapter.save()
                            cache.register_chapter(existing_chapter)
                            updated_count += 1
                            upd_msg = f"Updated chapter '{clean_name}'"
                            updated_items.append({'row': row_idx, 'name': clean_name, 'class_level': class_level.name, 'subject': subject.name, 'id': str(existing_chapter.id)})
                            details.append({'row': row_idx, 'name': clean_name, 'class_level': class_level.name, 'subject': subject.name, 'status': 'updated', 'message': upd_msg})
                        elif mode == 'create':
                            err_msg = f"Row {row_idx}: Chapter '{clean_name}' already exists (Class: {class_level.name}, Subject: {subject.name})"
                            errors.append(err_msg)
                            error_items.append({'row': row_idx, 'name': clean_name, 'error': err_msg})
                            details.append({'row': row_idx, 'name': clean_name, 'class_level': class_level.name, 'subject': subject.name, 'status': 'error', 'message': err_msg})
                    else:
                        if mode in ('skip_existing', 'skip', 'create', 'upsert'):
                            if clean_code:
                                if clean_code in cache.existing_codes:
                                    final_code = cache.generate_code(f"{clean_code}_{clean_name[:4]}")
                                else:
                                    final_code = clean_code
                                    cache.existing_codes.add(final_code)
                            else:
                                final_code = cache.generate_code(clean_name[:4])

                            new_chapter = Chapter.objects.create(
                                name=clean_name,
                                class_level=class_level,
                                subject=subject,
                                code=final_code,
                                sort_order=sort_order,
                                is_active=is_active,
                                created_by=user_str,
                                updated_by=user_str
                            )
                            cache.register_chapter(new_chapter)
                            created_count += 1
                            created_items.append({'row': row_idx, 'name': clean_name, 'class_level': class_level.name, 'subject': subject.name, 'id': str(new_chapter.id)})
                            details.append({'row': row_idx, 'name': clean_name, 'class_level': class_level.name, 'subject': subject.name, 'status': 'created', 'message': 'Successfully added'})
                        elif mode == 'update':
                            err_msg = f"Row {row_idx}: Chapter '{clean_name}' does not exist (skipped in Update-Only mode)"
                            errors.append(err_msg)
                            error_items.append({'row': row_idx, 'name': clean_name, 'error': err_msg})
                            details.append({'row': row_idx, 'name': clean_name, 'class_level': class_level.name, 'subject': subject.name, 'status': 'error', 'message': err_msg})
                except Exception as e:
                    err_text = str(e).strip() if str(e).strip() else f"Database/Format error ({type(e).__name__})"
                    err_msg = f"Row {row_idx}: {err_text}"
                    errors.append(err_msg)
                    error_items.append({'row': row_idx, 'name': row.get('Name', 'Unknown'), 'error': err_text})
                    details.append({'row': row_idx, 'name': row.get('Name', 'Unknown'), 'class_level': row.get('Class Level', ''), 'subject': row.get('Subject', ''), 'status': 'error', 'message': err_text})
            
            self.clear_cache()
            
            msg_parts = []
            if created_count: msg_parts.append(f"{created_count} created")
            if skipped_count: msg_parts.append(f"{skipped_count} skipped (already exist)")
            if updated_count: msg_parts.append(f"{updated_count} updated")
            if errors: msg_parts.append(f"{len(errors)} failed")
            summary = ", ".join(msg_parts) if msg_parts else "Processed 0 records"
            
            return response.Response({
                "message": f"Bulk import complete: {summary}",
                "total_rows": len(records),
                "created_count": created_count,
                "updated_count": updated_count,
                "skipped_count": skipped_count,
                "error_count": len(errors),
                "created_items": created_items,
                "updated_items": updated_items,
                "skipped_items": skipped_items,
                "error_items": error_items,
                "details": details,
                "errors": errors
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return response.Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ExamDetailViewSet(CachedListViewSetMixin, viewsets.ModelViewSet):
    queryset = ExamDetail.objects.select_related('session', 'exam_type', 'class_level').prefetch_related('target_exams', 'sessions', 'class_levels').all().order_by('-created_at')
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
            records = parse_tabular_file(file_obj)
            if not records:
                return response.Response({"error": "Uploaded file contains no data rows"}, status=status.HTTP_400_BAD_REQUEST)

            mode = request.data.get('mode', 'skip_existing').lower()
            
            created_count = 0
            updated_count = 0
            skipped_count = 0
            errors = []
            
            created_items = []
            updated_items = []
            skipped_items = []
            error_items = []
            details = []
            user_str = str(request.user.email or request.user.username or 'Admin') if request.user and request.user.is_authenticated else 'Bulk Import'
            cache = BulkImportCache(Topic)

            for row_idx, row in records:
                try:
                    name = get_field_case_insensitive(row, ['Name', 'Topic Name', 'Topic', 'Title', 'TopicName'])
                    chapter_name = get_field_case_insensitive(row, ['Chapter', 'Chapter Name', 'ChapterName'])
                    class_name = get_field_case_insensitive(row, ['Class Level', 'Class', 'ClassLevel', 'Class_Level'])
                    subject_name = get_field_case_insensitive(row, ['Subject', 'Subject Name', 'SubjectName', 'Subject_Name'])
                    code = get_field_case_insensitive(row, ['Code', 'Topic Code', 'TopicCode'])
                    sort_order_str = get_field_case_insensitive(row, ['Sort Order', 'Order', 'SortOrder'], '1')
                    is_active_str = get_field_case_insensitive(row, ['Is Active', 'Active', 'Status', 'IsActive'], 'true')
                    is_active = str(is_active_str).lower() in ('true', '1', 'yes', 'active')
                    
                    sort_order = 1
                    try:
                        sort_order = int(float(sort_order_str)) if sort_order_str else 1
                    except (ValueError, TypeError):
                        sort_order = 1
                    
                    if not name or not class_name or not subject_name:
                        err_msg = f"Row {row_idx}: Missing required fields (Name='{name}', Class='{class_name}', or Subject='{subject_name}')"
                        errors.append(err_msg)
                        error_items.append({'row': row_idx, 'name': name or 'N/A', 'error': err_msg})
                        details.append({'row': row_idx, 'name': name or 'N/A', 'class_level': class_name, 'subject': subject_name, 'status': 'error', 'message': err_msg})
                        continue
                        
                    class_level = cache.resolve_class(class_name)
                    subject = cache.resolve_sub(subject_name)
                    
                    if not class_level:
                        err_msg = f"Row {row_idx}: Class '{class_name}' not found in system"
                        errors.append(err_msg)
                        error_items.append({'row': row_idx, 'name': name, 'error': err_msg})
                        details.append({'row': row_idx, 'name': name, 'class_level': class_name, 'subject': subject_name, 'status': 'error', 'message': err_msg})
                        continue
                    if not subject:
                        err_msg = f"Row {row_idx}: Subject '{subject_name}' not found in system"
                        errors.append(err_msg)
                        error_items.append({'row': row_idx, 'name': name, 'error': err_msg})
                        details.append({'row': row_idx, 'name': name, 'class_level': class_level.name, 'subject': subject_name, 'status': 'error', 'message': err_msg})
                        continue

                    chapter = None
                    if chapter_name:
                        chapter = cache.find_chapter(chapter_name, class_level, subject)
                    
                    clean_name = re.sub(r'\s+', ' ', name.strip())
                    clean_code = code.strip() if code else ''

                    # In-memory instant duplicate lookup (O(1))
                    existing_topic = cache.find_topic(clean_name, class_level, subject, chapter)

                    if existing_topic:
                        if mode in ('skip_existing', 'skip'):
                            skipped_count += 1
                            skip_msg = f"Topic '{existing_topic.name}' already exists (Class: {class_level.name}, Subject: {subject.name})"
                            skipped_items.append({'row': row_idx, 'name': clean_name, 'class_level': class_level.name, 'subject': subject.name, 'reason': skip_msg})
                            details.append({'row': row_idx, 'name': clean_name, 'class_level': class_level.name, 'subject': subject.name, 'status': 'skipped', 'message': skip_msg})
                        elif mode in ('update', 'upsert'):
                            existing_topic.name = clean_name
                            existing_topic.chapter = chapter
                            existing_topic.class_level = class_level
                            existing_topic.subject = subject
                            if clean_code:
                                existing_topic.code = clean_code
                            existing_topic.sort_order = sort_order
                            existing_topic.is_active = is_active
                            existing_topic.updated_by = user_str
                            existing_topic.save()
                            cache.register_topic(existing_topic)
                            updated_count += 1
                            upd_msg = f"Updated topic '{clean_name}'"
                            updated_items.append({'row': row_idx, 'name': clean_name, 'class_level': class_level.name, 'subject': subject.name, 'id': str(existing_topic.id)})
                            details.append({'row': row_idx, 'name': clean_name, 'class_level': class_level.name, 'subject': subject.name, 'status': 'updated', 'message': upd_msg})
                        elif mode == 'create':
                            err_msg = f"Row {row_idx}: Topic '{clean_name}' already exists for Chapter {chapter_name or 'N/A'}"
                            errors.append(err_msg)
                            error_items.append({'row': row_idx, 'name': clean_name, 'error': err_msg})
                            details.append({'row': row_idx, 'name': clean_name, 'class_level': class_level.name, 'subject': subject.name, 'status': 'error', 'message': err_msg})
                    else:
                        if mode in ('skip_existing', 'skip', 'create', 'upsert'):
                            if clean_code:
                                if clean_code in cache.existing_codes:
                                    final_code = cache.generate_code(f"{clean_code}_{clean_name[:4]}")
                                else:
                                    final_code = clean_code
                                    cache.existing_codes.add(final_code)
                            else:
                                final_code = cache.generate_code(clean_name[:4])

                            new_topic = Topic.objects.create(
                                name=clean_name,
                                chapter=chapter,
                                class_level=class_level,
                                subject=subject,
                                code=final_code,
                                sort_order=sort_order,
                                is_active=is_active,
                                created_by=user_str,
                                updated_by=user_str
                            )
                            cache.register_topic(new_topic)
                            created_count += 1
                            created_items.append({'row': row_idx, 'name': clean_name, 'class_level': class_level.name, 'subject': subject.name, 'id': str(new_topic.id)})
                            details.append({'row': row_idx, 'name': clean_name, 'class_level': class_level.name, 'subject': subject.name, 'status': 'created', 'message': 'Successfully added'})
                        elif mode == 'update':
                            err_msg = f"Row {row_idx}: Topic '{clean_name}' does not exist (skipped in Update-Only mode)"
                            errors.append(err_msg)
                            error_items.append({'row': row_idx, 'name': clean_name, 'error': err_msg})
                            details.append({'row': row_idx, 'name': clean_name, 'class_level': class_level.name, 'subject': subject.name, 'status': 'error', 'message': err_msg})
                except Exception as e:
                    err_text = str(e).strip() if str(e).strip() else f"Database/Format error ({type(e).__name__})"
                    err_msg = f"Row {row_idx}: {err_text}"
                    errors.append(err_msg)
                    error_items.append({'row': row_idx, 'name': row.get('Name', 'Unknown'), 'error': err_text})
                    details.append({'row': row_idx, 'name': row.get('Name', 'Unknown'), 'class_level': row.get('Class Level', ''), 'subject': row.get('Subject', ''), 'status': 'error', 'message': err_text})
            
            self.clear_cache()
            
            msg_parts = []
            if created_count: msg_parts.append(f"{created_count} created")
            if skipped_count: msg_parts.append(f"{skipped_count} skipped (already exist)")
            if updated_count: msg_parts.append(f"{updated_count} updated")
            if errors: msg_parts.append(f"{len(errors)} failed")
            summary = ", ".join(msg_parts) if msg_parts else "Processed 0 records"
            
            return response.Response({
                "message": f"Bulk import complete: {summary}",
                "total_rows": len(records),
                "created_count": created_count,
                "updated_count": updated_count,
                "skipped_count": skipped_count,
                "error_count": len(errors),
                "created_items": created_items,
                "updated_items": updated_items,
                "skipped_items": skipped_items,
                "error_items": error_items,
                "details": details,
                "errors": errors
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return response.Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
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
            records = parse_tabular_file(file_obj)
            if not records:
                return response.Response({"error": "Uploaded file contains no data rows"}, status=status.HTTP_400_BAD_REQUEST)

            mode = request.data.get('mode', 'skip_existing').lower()
            
            created_count = 0
            updated_count = 0
            skipped_count = 0
            errors = []
            
            created_items = []
            updated_items = []
            skipped_items = []
            error_items = []
            details = []
            
            user_str = str(request.user.email or request.user.username or 'Admin') if request.user and request.user.is_authenticated else 'Bulk Import'
            cache = BulkImportCache(SubTopic)

            for row_idx, row in records:
                try:
                    name = get_field_case_insensitive(row, ['Name', 'SubTopic Name', 'SubTopic', 'Title', 'SubTopicName'])
                    topic_name = get_field_case_insensitive(row, ['Topic', 'Topic Name', 'TopicName'])
                    code = get_field_case_insensitive(row, ['Code', 'SubTopic Code', 'SubTopicCode'])
                    sort_order_str = get_field_case_insensitive(row, ['Sort Order', 'Order', 'SortOrder'], '1')
                    is_active_str = get_field_case_insensitive(row, ['Is Active', 'Active', 'Status', 'IsActive'], 'true')
                    is_active = str(is_active_str).lower() in ('true', '1', 'yes', 'active')
                    
                    sort_order = 1
                    try:
                        sort_order = int(float(sort_order_str)) if sort_order_str else 1
                    except (ValueError, TypeError):
                        sort_order = 1
                    
                    if not name or not topic_name:
                        err_msg = f"Row {row_idx}: Missing required fields (Name='{name}' or Topic='{topic_name}')"
                        errors.append(err_msg)
                        error_items.append({'row': row_idx, 'name': name or 'N/A', 'error': err_msg})
                        details.append({'row': row_idx, 'name': name or 'N/A', 'topic': topic_name, 'status': 'error', 'message': err_msg})
                        continue
                        
                    clean_topic_name = re.sub(r'\s+', ' ', topic_name.strip())
                    clean_topic_lower = clean_topic_name.lower()
                    clean_topic_norm = re.sub(r'[^a-zA-Z0-9]', '', clean_topic_name).lower()
                    
                    topic = cache.topic_map.get(clean_topic_lower) or cache.topic_map.get(clean_topic_norm)
                    if not topic:
                        for t in cache.topics:
                            if clean_topic_lower in t.name.lower():
                                topic = t
                                break
                    
                    if not topic:
                        err_msg = f"Row {row_idx}: Topic '{topic_name}' not found in system"
                        errors.append(err_msg)
                        error_items.append({'row': row_idx, 'name': name, 'error': err_msg})
                        details.append({'row': row_idx, 'name': name, 'topic': topic_name, 'status': 'error', 'message': err_msg})
                        continue
                    
                    clean_name = re.sub(r'\s+', ' ', name.strip())
                    clean_code = code.strip() if code else ''

                    # In-memory instant duplicate lookup (O(1))
                    existing_subtopic = cache.find_subtopic(clean_name, topic)

                    if existing_subtopic:
                        if mode in ('skip_existing', 'skip'):
                            skipped_count += 1
                            skip_msg = f"SubTopic '{existing_subtopic.name}' already exists for topic '{topic.name}'"
                            skipped_items.append({'row': row_idx, 'name': clean_name, 'topic': topic.name, 'reason': skip_msg})
                            details.append({'row': row_idx, 'name': clean_name, 'topic': topic.name, 'status': 'skipped', 'message': skip_msg})
                        elif mode in ('update', 'upsert'):
                            existing_subtopic.name = clean_name
                            existing_subtopic.topic = topic
                            if clean_code:
                                existing_subtopic.code = clean_code
                            existing_subtopic.sort_order = sort_order
                            existing_subtopic.is_active = is_active
                            existing_subtopic.updated_by = user_str
                            existing_subtopic.save()
                            cache.register_subtopic(existing_subtopic)
                            updated_count += 1
                            upd_msg = f"Updated subtopic '{clean_name}'"
                            updated_items.append({'row': row_idx, 'name': clean_name, 'topic': topic.name, 'id': str(existing_subtopic.id)})
                            details.append({'row': row_idx, 'name': clean_name, 'topic': topic.name, 'status': 'updated', 'message': upd_msg})
                        elif mode == 'create':
                            err_msg = f"Row {row_idx}: SubTopic '{clean_name}' already exists for Topic '{topic.name}'"
                            errors.append(err_msg)
                            error_items.append({'row': row_idx, 'name': clean_name, 'error': err_msg})
                            details.append({'row': row_idx, 'name': clean_name, 'topic': topic.name, 'status': 'error', 'message': err_msg})
                    else:
                        if mode in ('skip_existing', 'skip', 'create', 'upsert'):
                            if clean_code:
                                if clean_code in cache.existing_codes:
                                    final_code = cache.generate_code(f"{clean_code}_{clean_name[:4]}")
                                else:
                                    final_code = clean_code
                                    cache.existing_codes.add(final_code)
                            else:
                                final_code = cache.generate_code(clean_name[:4])

                            new_sub = SubTopic.objects.create(
                                name=clean_name,
                                topic=topic,
                                code=final_code,
                                sort_order=sort_order,
                                is_active=is_active,
                                created_by=user_str,
                                updated_by=user_str
                            )
                            cache.register_subtopic(new_sub)
                            created_count += 1
                            created_items.append({'row': row_idx, 'name': clean_name, 'topic': topic.name, 'id': str(new_sub.id)})
                            details.append({'row': row_idx, 'name': clean_name, 'topic': topic.name, 'status': 'created', 'message': 'Successfully added'})
                        elif mode == 'update':
                            err_msg = f"Row {row_idx}: SubTopic '{clean_name}' does not exist (skipped in Update-Only mode)"
                            errors.append(err_msg)
                            error_items.append({'row': row_idx, 'name': clean_name, 'error': err_msg})
                            details.append({'row': row_idx, 'name': clean_name, 'topic': topic.name, 'status': 'error', 'message': err_msg})
                except Exception as e:
                    err_text = str(e).strip() if str(e).strip() else f"Database/Format error ({type(e).__name__})"
                    err_msg = f"Row {row_idx}: {err_text}"
                    errors.append(err_msg)
                    error_items.append({'row': row_idx, 'name': row.get('Name', 'Unknown'), 'error': err_text})
                    details.append({'row': row_idx, 'name': row.get('Name', 'Unknown'), 'topic': row.get('Topic', ''), 'status': 'error', 'message': err_text})
            
            self.clear_cache()
            
            msg_parts = []
            if created_count: msg_parts.append(f"{created_count} created")
            if skipped_count: msg_parts.append(f"{skipped_count} skipped (already exist)")
            if updated_count: msg_parts.append(f"{updated_count} updated")
            if errors: msg_parts.append(f"{len(errors)} failed")
            summary = ", ".join(msg_parts) if msg_parts else "Processed 0 records"
            
            return response.Response({
                "message": f"Bulk import complete: {summary}",
                "total_rows": len(records),
                "created_count": created_count,
                "updated_count": updated_count,
                "skipped_count": skipped_count,
                "error_count": len(errors),
                "created_items": created_items,
                "updated_items": updated_items,
                "skipped_items": skipped_items,
                "error_items": error_items,
                "details": details,
                "errors": errors
            }, status=status.HTTP_200_OK)
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
            'pdfs', 'videos', 'dpps', 'questions', 'sessions', 'target_exams', 'class_levels'
        )
            
        queryset = queryset.all().order_by('-created_at')
        return self.filter_by_section(queryset, 'section')

    def get_object(self):
        """Override get_object to avoid distinct() issues with detail lookups."""
        # Use a simpler queryset for detail views that just selects related data
        queryset = LibraryItem.objects.select_related(
            'session', 'class_level', 'subject', 'chapter', 'topic', 
            'exam_type', 'target_exam', 'section'
        ).prefetch_related(
            'pdfs', 'videos', 'dpps', 'questions', 'sessions', 'target_exams', 'class_levels'
        )
        # Get the single object by primary key
        pk = self.kwargs.get(self.lookup_url_kwarg or self.lookup_field)
        try:
            obj = queryset.get(pk=pk)
        except LibraryItem.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound("LibraryItem not found")
        except LibraryItem.MultipleObjectsReturned:
            # If there are still duplicates, this indicates data corruption
            # Log the error and return the first one
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Multiple LibraryItems found with pk={pk}. Database corruption detected.")
            obj = queryset.filter(pk=pk).first()
            if not obj:
                from rest_framework.exceptions import NotFound
                raise NotFound("LibraryItem not found")
        return obj

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
        
        is_update = request.data.get('update_granular') == 'true'
        
        # Handle top-level thumbnail removal
        if request.data.get('remove_thumbnail') in [True, 'true', 'True']:
            item.thumbnail = None
            item.save()

        if is_update:
            # Handle Deletions for PDFs
            # Default: if keep_pdfs is provided (even if empty), use it to determine what to delete
            if 'keep_pdfs' in request.data:
                keep_pdf_ids = [id for id in request.data.getlist('keep_pdfs') if id]  # Filter out empty strings
                if keep_pdf_ids:
                    item.pdfs.exclude(pk__in=keep_pdf_ids).delete()
                else:
                    item.pdfs.all().delete()
                
            # Handle Deletions for Videos (Unified Files & Links)
            # Both keep_videos and keep_video_links fields are checked for backward compatibility
            # but they now operate on the unified videos collection.
            video_ids_to_keep = []
            if 'keep_videos' in request.data:
                video_ids_to_keep.extend([id for id in request.data.getlist('keep_videos') if id])
            if 'keep_video_links' in request.data:
                video_ids_to_keep.extend([id for id in request.data.getlist('keep_video_links') if id])
            
            if 'keep_videos' in request.data or 'keep_video_links' in request.data:
                # Remove duplicates from the keep list
                unique_keep_ids = list(set(video_ids_to_keep))
                if unique_keep_ids:
                    # Correctly exclude and delete orphaned video records
                    item.videos.exclude(pk__in=unique_keep_ids).delete()
                else:
                    item.videos.all().delete()

            # Handle Deletions for DPPs
            # Default: if keep_dpps is provided (even if empty), use it to determine what to delete
            if 'keep_dpps' in request.data:
                keep_dpp_ids = [id for id in request.data.getlist('keep_dpps') if id]  # Filter out empty strings
                if keep_dpp_ids:
                    item.dpps.exclude(pk__in=keep_dpp_ids).delete()
                else:
                    item.dpps.all().delete()
        
        # 1a. Update existing PDFs (metadata + optional new thumbnail)
        existing_pdfs_data = request.data.get('existing_pdfs_data', '[]')
        try:
            existing_pdfs = json.loads(existing_pdfs_data)
            for p in existing_pdfs:
                pdf_id = p.get('id')
                if pdf_id:
                    try:
                        pdf_obj = item.pdfs.get(pk=pdf_id)
                        if p.get('name'):
                            pdf_obj.title = p['name']
                        if p.get('description') is not None:
                            pdf_obj.description = p['description']
                        thumb = request.FILES.get(f'existing_pdf_{pdf_id}_thumb')
                        if thumb:
                            pdf_obj.thumbnail = thumb
                        elif p.get('remove_thumb') in [True, 'true', 'True']:
                            pdf_obj.thumbnail = None
                        pdf_obj.save()
                    except LibraryPDF.DoesNotExist:
                        pass
        except Exception as e:
            print(f"Error updating existing PDFs: {e}")

        # 1b. Create new PDFs with individual thumbnails, titles, and descriptions
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
            
        # 2a. Update existing Videos
        existing_videos_data = request.data.get('existing_videos_data', '[]')
        try:
            existing_videos = json.loads(existing_videos_data)
            for v in existing_videos:
                video_id = v.get('id')
                if video_id:
                    try:
                        video_obj = item.videos.get(pk=video_id)
                        if v.get('name'):
                            video_obj.title = v['name']
                        if v.get('description') is not None:
                            video_obj.description = v['description']
                        if v.get('link'):
                            video_obj.video_link = v['link']
                        thumb = request.FILES.get(f'existing_video_{video_id}_thumb')
                        if thumb:
                            video_obj.thumbnail = thumb
                        elif v.get('remove_thumb') in [True, 'true', 'True']:
                            video_obj.thumbnail = None
                        video_obj.save()
                    except LibraryVideo.DoesNotExist:
                        pass
        except Exception as e:
            print(f"Error updating existing videos: {e}")

        # 2b. Create new Video Files with individual details
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
                    if v.get('id'):
                        try:
                            video = item.videos.get(pk=v.get('id'))
                            video.video_link = link_url.strip()
                            video.title = v.get('name') or f"Video Link {i+1}"
                            video.description = v.get('description')
                            if thumb:
                                video.thumbnail = thumb
                            elif v.get('remove_thumb') in [True, 'true', 'True']:
                                video.thumbnail = None
                            video.save()
                        except LibraryVideo.DoesNotExist:
                            pass
                    else:
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

        # 4a. Update existing DPPs
        existing_dpps_data = request.data.get('existing_dpps_data', '[]')
        try:
            existing_dpps = json.loads(existing_dpps_data)
            for d in existing_dpps:
                dpp_id = d.get('id')
                if dpp_id:
                    try:
                        dpp_obj = item.dpps.get(pk=dpp_id)
                        if d.get('name'):
                            dpp_obj.title = d['name']
                        if d.get('description') is not None:
                            dpp_obj.description = d['description']
                        thumb = request.FILES.get(f'existing_dpp_{dpp_id}_thumb')
                        if thumb:
                            dpp_obj.thumbnail = thumb
                        elif d.get('remove_thumb') in [True, 'true', 'True']:
                            dpp_obj.thumbnail = None
                        dpp_obj.save()
                    except LibraryDPP.DoesNotExist:
                        pass
        except Exception as e:
            print(f"Error updating existing DPPs: {e}")

        # 4b. Handle multiple new DPPs
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
        ).prefetch_related('sections', 'sessions', 'target_exams').all().order_by('-created_at')
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
        ).prefetch_related('sessions', 'target_exams').all().order_by('-created_at')
        return self.filter_by_section(queryset, 'section')

class LiveClassViewSet(CachedListViewSetMixin, StudentSectionFilterMixin, viewsets.ModelViewSet):
    queryset = LiveClass.objects.all()
    serializer_class = LiveClassSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = LiveClass.objects.select_related(
            'session', 'class_level', 'subject', 'exam_type', 'target_exam', 'section'
        ).prefetch_related('packages', 'sessions', 'target_exams').all().order_by('-created_at')
        return self.filter_by_section(queryset, 'section')

class VideoViewSet(CachedListViewSetMixin, StudentSectionFilterMixin, viewsets.ModelViewSet):
    queryset = Video.objects.all()
    serializer_class = VideoSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        queryset = Video.objects.select_related(
            'session', 'class_level', 'subject', 'exam_type', 'target_exam', 'section'
        ).prefetch_related('packages', 'sessions', 'target_exams').all().order_by('-created_at')
        return self.filter_by_section(queryset, 'section')

class PenPaperTestViewSet(CachedListViewSetMixin, StudentSectionFilterMixin, viewsets.ModelViewSet):
    queryset = PenPaperTest.objects.all()
    serializer_class = PenPaperTestSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        queryset = PenPaperTest.objects.select_related(
            'session', 'class_level', 'subject', 'exam_type', 'target_exam'
        ).prefetch_related('packages', 'sections', 'sessions', 'target_exams').all().order_by('-created_at')
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
        ).prefetch_related('sections', 'packages', 'sessions', 'target_exams').all().order_by('-created_at')
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

class PsychometricQuestionViewSet(viewsets.ModelViewSet):
    queryset = PsychometricQuestion.objects.all().order_by('trait', 'order')
    serializer_class = PsychometricQuestionSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    pagination_class = StandardPagination

class MistakeReasonViewSet(viewsets.ModelViewSet):
    queryset = MistakeReason.objects.filter(is_active=True).order_by('name')
    serializer_class = MistakeReasonSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

class PsychometricTraitViewSet(viewsets.ModelViewSet):
    queryset = PsychometricTrait.objects.all().order_by('order', 'created_at')
    serializer_class = PsychometricTraitSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='config')
    def config(self, request):
        from django.db import models
        traits = PsychometricTrait.objects.filter(is_active=True).prefetch_related(
            models.Prefetch(
                'questions',
                queryset=PsychometricQuestion.objects.filter(is_active=True).order_by('order', 'created_at')
            )
        ).order_by('order', 'created_at')
        serializer = self.get_serializer(traits, many=True)
        return response.Response(serializer.data)

class PsychometricQuestionViewSet(viewsets.ModelViewSet):
    queryset = PsychometricQuestion.objects.select_related('trait').all().order_by('trait__order', 'order', 'created_at')
    serializer_class = PsychometricQuestionSerializer
    permission_classes = [permissions.IsAuthenticated]

class ChapterTestSettingViewSet(viewsets.ModelViewSet):
    queryset = ChapterTestSetting.objects.all()
    serializer_class = ChapterTestSettingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request, *args, **kwargs):
        setting, _ = ChapterTestSetting.objects.get_or_create(id=1)
        serializer = self.get_serializer(setting)
        return response.Response([serializer.data])
