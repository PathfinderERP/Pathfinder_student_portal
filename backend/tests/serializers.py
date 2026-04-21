from rest_framework import serializers
from .models import Test, TestCentreAllotment
from master_data.models import Session, ExamType, ClassLevel, TargetExam, MasterSection
from master_data.serializers import SessionSerializer, ExamTypeSerializer, ClassLevelSerializer, TargetExamSerializer
from sections.models import Section
from centres.models import Centre
from centres.serializers import CentreSerializer
from packages.models import Package
from bson import ObjectId

class ObjectIdRelatedField(serializers.PrimaryKeyRelatedField):
    def to_internal_value(self, data):
        try:
            if isinstance(data, str) and ObjectId.is_valid(data):
                data = ObjectId(data)
        except Exception:
            pass
        return super().to_internal_value(data)

    def to_representation(self, value):
        return str(value.pk)

class TestCentreAllotmentSerializer(serializers.ModelSerializer):
    centre_details = CentreSerializer(source='centre', read_only=True)
    test_name = serializers.ReadOnlyField(source='test.name')
    # Explicitly handle ObjectId fields
    id = serializers.SerializerMethodField()
    test = serializers.SerializerMethodField()
    centre = serializers.SerializerMethodField()

    class Meta:
        model = TestCentreAllotment
        fields = ['id', 'test', 'centre', 'test_name', 'centre_details', 'start_time', 'end_time', 'is_active', 'access_code', 'is_code_sent', 'was_sent', 'code_history', 'created_at', 'updated_at']
    
    def get_id(self, obj):
        return obj.id
    
    def get_test(self, obj):
        return str(obj.test.pk) if obj.test else None
    
    def get_centre(self, obj):
        return str(obj.centre.pk) if obj.centre else None


class TestSerializer(serializers.ModelSerializer):
    # For GET requests, we might want nested details
    session_details = SessionSerializer(source='session', read_only=True)
    target_exam_details = TargetExamSerializer(source='target_exam', read_only=True)
    exam_type_details = ExamTypeSerializer(source='exam_type', read_only=True)
    class_level_details = ClassLevelSerializer(source='class_level', read_only=True)
    package_name = serializers.ReadOnlyField(source='package.name')
    
    # Explicitly define allotted_sections to handle M2M with MasterSection (Integer pk)
    allotted_sections = serializers.PrimaryKeyRelatedField(
        queryset=MasterSection.objects.all(),
        many=True,
        required=False
    )
    
    # Explicitly define centres to handle M2M with ObjectId pk
    centres = ObjectIdRelatedField(
        queryset=Centre.objects.all(),
        many=True,
        required=False
    )

    package = ObjectIdRelatedField(
        queryset=Package.objects.all(),
        required=False,
        allow_null=True
    )
    
    # We can add a method to get count of allotted centres or details
    centres_count = serializers.SerializerMethodField()
    codes_sent_count = serializers.SerializerMethodField()
    sections_count = serializers.SerializerMethodField()
    allotted_master_count = serializers.SerializerMethodField()
    
    # Per-user schedule fields
    start_time = serializers.SerializerMethodField()
    end_time = serializers.SerializerMethodField()

    class Meta:
        model = Test
        fields = [
            'id', 'name', 'code', 'session', 'session_details', 'target_exam', 'target_exam_details',
            'exam_type', 'exam_type_details', 'package', 'package_name', 'class_level', 'class_level_details',
            'centres', 'centres_count', 'codes_sent_count', 'allotted_sections', 'sections_count', 
            'allotted_master_count', 'duration', 'total_marks', 'description', 'instructions', 
            'is_completed', 'is_over', 'has_calculator', 'is_result_published', 'option_type_numeric', 'created_at', 'updated_at',
            'start_time', 'end_time', 'submission', 'total_students', 'total_roster_count'
        ]
        
    submission = serializers.SerializerMethodField()
    total_students = serializers.SerializerMethodField()
    total_roster_count = serializers.SerializerMethodField()
    is_over = serializers.SerializerMethodField()

    def get_is_over(self, obj):
        from django.utils import timezone
        allotments = list(obj.centre_allotments.all())
        if not allotments:
            return False
        # A test is considered over if ALL allotments have ended
        now = timezone.now()
        return all(a.end_time and a.end_time < now for a in allotments)

    def get_total_students(self, obj):
        request = self.context.get('request')
        is_staff = request and (request.user.is_staff or getattr(request.user, 'user_type', '') != 'student')
        if not is_staff:
            return 0

        view = self.context.get('view')
        action = getattr(view, 'action', None) if view else None
        if action in ['list', 'create', 'update', 'partial_update']:
            return 0  # Handled in bulk by the view for 'list'

        # High-performance submission count bypassing Djongo parser
        from api.db_utils import get_db
        db = get_db()
        if db is None: return 0
        
        try:
            return db['tests_testsubmission'].count_documents({'test_id': obj.pk})
        except Exception:
            return 0
            
    def get_total_roster_count(self, obj):
        request = self.context.get('request')
        is_staff = request and (request.user.is_staff or getattr(request.user, 'user_type', '') != 'student')
        if not is_staff:
            return 0

        from django.core.cache import cache

        # 1. Aggressive Caching
        cache_key = f"test_roster_v2_{obj.pk}_{obj.updated_at.timestamp()}"
        cached_count = cache.get(cache_key)
        if cached_count is not None:
            return cached_count
            
        # 2. Performance Safeguard: If this is a non-detail view request ('list', 'update', etc), 
        # do NOT calculate from scratch. Return 0 and let the detail view calculate it.
        # This fixes the 16+ second hang in the Admin Panel during saves.
        view = self.context.get('view')
        action = getattr(view, 'action', None) if view else None
        if action in ['list', 'create', 'update', 'partial_update']:
            return 0

        from api.models import CustomUser
        from django.db.models import Q
        from api.db_utils import parse_section

        try:
            centres = list(obj.centres.all())
            if not centres: 
                cache.set(cache_key, 0, 3600)
                return 0

            # authoritative Baseline: All Students with existing submissions
            # Note: We NO LONGER count submitted students as a baseline for the roster.
            # This ensures that if a test is un-allotted, the roster correctly drops to 0.


            seen_identifiers = set()
            total_count = 0

            if not centres: 
                return total_count

            # Fallback Logic (De-duplicated Global Roster)
            allowed_sections = [s.name.strip().lower() for s in obj.allotted_sections.all()]
            
            # 1. Count Local Students (Global Deduplication)
            for centre in centres:
                c_code = centre.code
                c_name = centre.name
                centre_q = Q(centre_code__iexact=c_code) | Q(centre_name__iexact=c_name)
                local_pool = CustomUser.objects.filter(user_type='student').filter(centre_q)
                
                for student in local_pool:
                    uid = (student.username or str(student.pk)).upper().strip()
                    if uid in seen_identifiers: continue
                    
                    # If they matched centre, we apply section filter (RESTRICTIVE)
                    if not allowed_sections:
                        continue # If no sections are allotted to test, no student can see it
                        
                    s_exams = [s.lower() for s in parse_section(student.exam_section)]
                    s_studies = [s.lower() for s in parse_section(student.study_section)]
                    if not any(sec in allowed_sections for sec in (s_exams + s_studies)):
                        continue
                    
                    seen_identifiers.add(uid)
                    if student.admission_number: seen_identifiers.add(student.admission_number.upper().strip())
                    if student.email: seen_identifiers.add(student.email.lower().strip())
                    total_count += 1

            # 2. ERP Students (Global Deduplication)
            from api.erp_views import _fetch_all_students_erp
            erp_pool = _fetch_all_students_erp() # Uses internal cache or fetches
            centre_queries = [(c.name.upper().strip(), c.code.upper().strip()) for c in centres]
            
            for erp_student in erp_pool:
                if not isinstance(erp_student, dict): continue
                
                # Deduplicate
                e_adm = str(erp_student.get('admissionNumber') or '').upper().strip()
                e_email = str(erp_student.get('student', {}).get('studentsDetails', [{}])[0].get('studentEmail') or "").lower().strip()
                
                if (e_adm and e_adm in seen_identifiers) or (e_email and e_email in seen_identifiers):
                    continue

                # --- SHOW ALL STUDENTS MATCHING SECTIONS (IRRESPECTIVE OF SESSION) ---
                # 1. Section Match (RESTRICTIVE)
                if not allowed_sections:
                    continue # No sections assigned = hidden from all students
                    
                sec_allot = erp_student.get('sectionAllotment', {})
                if not isinstance(sec_allot, dict): continue
                e_exams = [s.lower() for s in parse_section(sec_allot.get('examSection'))]
                e_studies = [s.lower() for s in parse_section(sec_allot.get('studySection'))]
                if not any(sec in allowed_sections for sec in (e_exams + e_studies)):
                    continue
                
                # 2. Centre Match
                e_centre_raw = erp_student.get('centre')
                if not e_centre_raw:
                    v = erp_student.get('venue')
                    if isinstance(v, dict): e_centre_raw = v.get('centreName') or v.get('name')
                    else: e_centre_raw = v
                
                e_centre = str(e_centre_raw or '').upper().strip()
                if not e_centre: continue
                
                # Fuzzy match for global roster
                matches_any = False
                for c_name, c_code in centre_queries:
                    # Match if names identical OR codes identical OR partial name match (e.g. 'HOWRAH' in 'HOWRAH_FRANCHISE')
                    if c_name == e_centre or c_code == e_centre or \
                       c_name in e_centre or e_centre in c_name:
                        matches_any = True
                        break
                if not matches_any: continue
                
                if e_adm: seen_identifiers.add(e_adm)
                if e_email: seen_identifiers.add(e_email)
                total_count += 1

            # 3. Cache and Return
            cache.set(cache_key, total_count, 3600) # 1 Hour
            return total_count
        except Exception as e:
            print(f"Error in get_total_roster_count: {e}")
            return 0

    def get_submission(self, obj):
        request = self.context.get('request')
        if not request or not request.user or request.user.is_anonymous:
            return None
        
        view = self.context.get('view')
        action = getattr(view, 'action', None) if view else None
        if action in ['list', 'create', 'update', 'partial_update']:
            # PERFORMANCE: Staff see thousands of tests, so we omit submission info in list views.
            # Students only see a few tests allotted to them, so we allow it for UI state.
            if request.user.is_staff or getattr(request.user, 'user_type', '') != 'student':
                return None
            
        # Optimization: Use PyMongo directly to bypass Djongo's SQL parser RecursionError (500)
        from api.db_utils import get_db
        db = get_db()
        if db is None:
            return None
            
        try:
            # Match directly on the integer test_id and the student ObjectId
            sub = db['tests_testsubmission'].find_one({
                'test_id': obj.pk,
                'student_id': request.user.pk
            }, {'is_finalized': 1, 'allow_resume': 1, 'time_spent': 1})
            
            if not sub:
                return None
                
            return {
                'is_finalized': sub.get('is_finalized', False),
                'allow_resume': sub.get('allow_resume', False),
                'time_spent': sub.get('time_spent', 0)
            }
        except Exception:
            return None

    def _get_user_allotment(self, obj):
        request = self.context.get('request')
        if not request or not request.user or request.user.is_anonymous:
            return None
        
        user = request.user
        if getattr(user, 'user_type', None) != 'student':
            return None
            
        c_code = getattr(user, 'centre_code', None)
        c_name = getattr(user, 'centre_name', None)
        if not c_code and not c_name:
            return None
            
        # Optimization: Iterate in memory over the prefetched centre_allotments
        # to avoid triggering extra DB joins that enter the Djongo SQL-to-Mongo parser bug.
        allotments = obj.centre_allotments.all()
        for allotment in allotments:
            # centre is also prefetched (check views.py)
            c = allotment.centre
            if (c_code and c.code.strip().lower() == c_code.strip().lower()) or \
               (c_name and c.name.strip().lower() == c_name.strip().lower()):
                return allotment
        return None

    def get_start_time(self, obj):
        allotment = self._get_user_allotment(obj)
        return allotment.start_time if allotment else None

    def get_end_time(self, obj):
        allotment = self._get_user_allotment(obj)
        return allotment.end_time if allotment else None
        
    def get_centres_count(self, obj):
        # Use python len() to leverage prefetch_related and avoid DB hit
        return len(obj.centre_allotments.all())
        
    def get_codes_sent_count(self, obj):
        # Use python generator to leverage prefetch_related and avoid DB hit
        return sum(1 for a in obj.centre_allotments.all() if a.is_code_sent)

    def get_sections_count(self, obj):
        # Total = Owned + Allotted
        owned = len(obj.sections.all())
        allotted = len(obj.allotted_sections.all())
        return owned + allotted

    def get_allotted_master_count(self, obj):
        # Only count sections from Master Registry. Since allotted_sections points to MasterSection,
        # all of them are considered master sections.
        return len(obj.allotted_sections.all())
