from rest_framework import serializers
from .models import Test, TestCentreAllotment
from master_data.models import Session, ExamType, ClassLevel, TargetExam
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
    sessions_details = SessionSerializer(source='sessions', many=True, read_only=True)
    target_exam_details = serializers.SerializerMethodField()
    exam_type_details = ExamTypeSerializer(source='exam_type', read_only=True)
    class_level_details = ClassLevelSerializer(source='class_level', read_only=True)
    class_levels_details = ClassLevelSerializer(source='class_levels', many=True, read_only=True)
    package_name = serializers.ReadOnlyField(source='package.name')
    
    
    # Explicitly define centres to handle M2M with ObjectId pk
    centres = ObjectIdRelatedField(
        queryset=Centre.objects.all(),
        many=True,
        required=False
    )
    
    sessions = ObjectIdRelatedField(
        queryset=Session.objects.all(),
        many=True,
        required=False
    )
    
    class_levels = ObjectIdRelatedField(
        queryset=ClassLevel.objects.all(),
        many=True,
        required=False
    )

    package = ObjectIdRelatedField(
        queryset=Package.objects.all(),
        required=False,
        allow_null=True
    )

    target_exams = ObjectIdRelatedField(
        queryset=TargetExam.objects.all(),
        many=True,
        required=False
    )
    
    # We can add a method to get count of allotted centres or details
    centres_count = serializers.SerializerMethodField()
    codes_sent_count = serializers.SerializerMethodField()
    sections_count = serializers.SerializerMethodField()
    # OMR failed record count — drives the Failed Records button state in frontend
    failed_omr_count = serializers.SerializerMethodField()
    
    # Per-user schedule fields
    start_time = serializers.SerializerMethodField()
    end_time = serializers.SerializerMethodField()

    class Meta:
        model = Test
        fields = [
            'id', 'name', 'code', 'session', 'session_details', 'sessions', 'sessions_details', 'target_exams', 'target_exam_details',
            'exam_type', 'exam_type_details', 'package', 'package_name', 'class_level', 'class_level_details', 'class_levels', 'class_levels_details',
            'centres', 'centres_count', 'codes_sent_count', 'sections_count',  
            'duration', 'total_marks', 'description', 'instructions', 
            'is_completed', 'is_over', 'has_calculator', 'is_result_published', 'option_type_numeric', 'is_omr_based', 'created_at', 'updated_at',
            'start_time', 'end_time', 'submission', 'total_students', 'total_roster_count', 'failed_omr_count'
        ]
        
    submission = serializers.SerializerMethodField()
    total_students = serializers.SerializerMethodField()
    total_roster_count = serializers.SerializerMethodField()
    is_over = serializers.SerializerMethodField()

    def get_failed_omr_count(self, obj):
        """Count of unresolved OMR failed records for this test."""
        try:
            return obj.failed_omr_records.count()
        except Exception:
            return 0

    def get_target_exam_details(self, obj):
        # Reuse the prefetched target_exams M2M result instead of triggering
        # a second DB query (Djongo doesn't share the prefetch cache between
        # a TargetExamSerializer(source='target_exams') field and the
        # ObjectIdRelatedField for the same relation).
        return TargetExamSerializer(obj.target_exams.all(), many=True).data

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
        if action in ['list', 'create', 'update', 'partial_update', 'retrieve']:
            return 0  # Handled in bulk by the view for 'list', not needed for retrieve/edit

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

        # Performance Safeguard: check action BEFORE touching the DB or building
        # expensive cache keys. list/create/update actions return 0 immediately
        # (counts are injected in bulk by the view). This must be checked before
        # the cache_key line so that tests with updated_at=None don't crash.
        view = self.context.get('view')
        action = getattr(view, 'action', None) if view else None
        if action in ['list', 'create', 'update', 'partial_update', 'retrieve']:
            return 0

        from django.core.cache import cache

        # Guard: some legacy tests may have updated_at=None
        if obj.updated_at is None:
            cache_key = f"test_roster_v2_{obj.pk}_0"
        else:
            cache_key = f"test_roster_v2_{obj.pk}_{obj.updated_at.timestamp()}"
        cached_count = cache.get(cache_key)
        if cached_count is not None:
            return cached_count

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
            
            # 1. Count Local Students (Global Deduplication)
            for centre in centres:
                c_code = centre.code
                c_name = centre.name
                centre_q = Q(centre_code__iexact=c_code) | Q(centre_name__iexact=c_name)
                local_pool = CustomUser.objects.filter(user_type='student').filter(centre_q)
                
                for student in local_pool:
                    uid = (student.username or str(student.pk)).upper().strip()
                    if uid in seen_identifiers: continue
                    
                    seen_identifiers.add(uid)
                    if student.admission_number: seen_identifiers.add(student.admission_number.upper().strip())
                    if student.email: seen_identifiers.add(student.email.lower().strip())
                    total_count += 1

            # 2. ERP Students (Global Deduplication)
            from api.erp_views import _fetch_all_students_erp
            # Guard: _fetch_all_students_erp can return None on transient errors
            erp_pool = _fetch_all_students_erp() or []
            centre_queries = [(c.name.upper().strip(), c.code.upper().strip()) for c in centres]
            
            for erp_student in erp_pool:
                if not isinstance(erp_student, dict): continue
                
                # Deduplicate
                e_adm = str(erp_student.get('admissionNumber') or '').upper().strip()
                e_email = ''
                student_obj = erp_student.get('student') or {}
                details_list = student_obj.get('studentsDetails') or []
                if details_list:
                    e_email = str(details_list[0].get('studentEmail') or '').lower().strip()
                
                if (e_adm and e_adm in seen_identifiers) or (e_email and e_email in seen_identifiers):
                    continue

                # --- SHOW ALL STUDENTS MATCHING CENTRE ---
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
        
        # PERFORMANCE: Staff and superadmins do not have submissions. Skip the DB query entirely.
        if request.user.is_staff or getattr(request.user, 'user_type', '') != 'student':
            return None

        view = self.context.get('view')
        action = getattr(view, 'action', None) if view else None
        if action in ['list', 'create', 'update', 'partial_update']:
            # Students only see a few tests allotted to them, so we allow it for UI state in list view.
            pass
            
        # PERFORMANCE OPTIMIZATION: Check if submissions were pre-fetched in the list view context
        student_subs = self.context.get('student_submissions')
        sub = None
        if student_subs and isinstance(student_subs, dict):
            sub = student_subs.get(str(obj.pk))
        else:
            # Fallback to single lookup if not in bulk context (e.g. detail view)
            from api.db_utils import get_db
            db = get_db()
            if db:
                try:
                    # Match directly on the integer test_id and the student ObjectId
                    sub = db['tests_testsubmission'].find_one({
                        'test_id': obj.pk,
                        'student_id': request.user.pk
                    }, {'is_finalized': 1, 'allow_resume': 1, 'time_spent': 1, 'submitted_at': 1, 'updated_at': 1, 'score': 1})
                except Exception:
                    pass
        
        if not sub:
            return None
            
        submitted_at = sub.get('submitted_at') or sub.get('updated_at')
        return {
            'is_finalized': sub.get('is_finalized', False),
            'allow_resume': sub.get('allow_resume', False),
            'time_spent': sub.get('time_spent', 0),
            'score': float(sub.get('score', 0)),
            'submitted_date': submitted_at.isoformat() if hasattr(submitted_at, 'isoformat') else str(submitted_at) if submitted_at else None
        }

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

        # Cache per-instance: start_time and end_time both call this method,
        # so avoid iterating allotments twice.
        cache_attr = '_cached_user_allotment'
        if not hasattr(obj, cache_attr):
            result = None
            for allotment in obj.centre_allotments.all():
                # centre is prefetched (see views.py list action)
                c = allotment.centre
                if (c_code and c.code.strip().lower() == str(c_code).strip().lower()) or \
                   (c_name and c.name.strip().lower() == str(c_name).strip().lower()):
                    result = allotment
                    break
            object.__setattr__(obj, cache_attr, result)
        return getattr(obj, cache_attr)


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
        # Total = Owned
        return len(obj.sections.all())


class TestListSerializer(TestSerializer):
    """Lightweight serializer for the admin test list view.
    Excludes large HTML fields (description, instructions) that are only
    needed when editing a single test. This significantly reduces response
    size and serialization time for the list endpoint."""

    class Meta(TestSerializer.Meta):
        fields = [
            f for f in TestSerializer.Meta.fields
            if f not in ('description', 'instructions')
        ]
