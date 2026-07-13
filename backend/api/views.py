from rest_framework import viewsets, permissions, generics, status, response, views
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
import logging

logger = logging.getLogger(__name__)

from .models import (
    UploadedFile, CustomUser, LoginLog, Grievance, StudyTask, Notice, 
    StudentPsychometricProfile, StudentStudyPlannerConfig, UserActivityLog, Doubt
)
from master_data.models import LibraryItem, Subject, Chapter, Topic
from django.db.models import Q
from .serializers import (
    UploadedFileSerializer, CustomTokenObtainPairSerializer, 
    UserSerializer, UserCreateSerializer, LoginLogSerializer,
    GrievanceSerializer, StudyTaskSerializer, NoticeSerializer,
    StudentPsychometricProfileSerializer, StudentStudyPlannerConfigSerializer,
    UserActivityLogSerializer, DoubtSerializer
)

@api_view(['GET'])
@permission_classes([AllowAny])
def system_status(request):
    """Diagnose backend health and Cache/DB connectivity on AWS"""
    from django.core.cache import cache
    from django.conf import settings
    import os
    
    redis_url = os.getenv('REDIS_URL')
    cache_backend = cache.__class__.__name__
    
    # Test Redis connectivity
    redis_alive = False
    try:
        cache.set('health_check_ping', 'pong', timeout=10)
        redis_alive = (cache.get('health_check_ping') == 'pong')
    except Exception:
        pass
        
    print(f"📊 SYSTEM STATUS CHECK: Redis={redis_alive}, Backend={cache_backend}")
    return response.Response({
        "status": "online",
        "cache_backend": cache_backend,
        "redis_configured": bool(redis_url),
        "redis_alive": redis_alive,
        "database": "Atlas MongoDB (Direct)"
    })

class IsSuperAdmin(permissions.BasePermission):
    """
    Custom permission to only allow superadmins to create users.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and getattr(request.user, 'user_type', None) == 'superadmin'

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class LoginHistoryView(generics.ListAPIView):
    serializer_class = LoginLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request, *args, **kwargs):
        from .db_utils import get_recent_logs_direct
        logs = get_recent_logs_direct(10)
        return response.Response(logs)

class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

class RegisterView(generics.CreateAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = UserCreateSerializer
    permission_classes = [IsSuperAdmin]
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

class UserViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        """
        Override get_object to handle MongoDB ObjectId lookups properly with Djongo
        """
        from bson import ObjectId
        pk = self.kwargs.get('pk')
        try:
            # Try to get the user by _id (MongoDB ObjectId)
            return CustomUser.objects.get(_id=ObjectId(pk))
        except (CustomUser.DoesNotExist, Exception):
            # Fallback to default behavior
            return super().get_object()

    @action(detail=True, methods=['post'])
    def change_password(self, request, pk=None):
        user = self.get_object()
        password = request.data.get('password')
        if not password:
            return response.Response({'error': 'Password is required'}, status=400)
        user.set_password(password)
        user.save()
        return response.Response({'status': 'password set'})

class FileViewSet(viewsets.ModelViewSet):
    queryset = UploadedFile.objects.all()
    serializer_class = UploadedFileSerializer
    permission_classes = [permissions.IsAuthenticated]

class GrievanceViewSet(viewsets.ModelViewSet):
    queryset = Grievance.objects.all()
    serializer_class = GrievanceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Minimal queryset needed for DRF routing — actual data served by list() override
        return Grievance.objects.all()

    def _format_doc(self, doc):
        """Convert a raw MongoDB document to a clean dict for JSON response."""
        def safe_str(val):
            return str(val) if val is not None else None

        date_val = doc.get('date')
        if date_val and hasattr(date_val, 'isoformat'):
            date_val = date_val.isoformat()
        
        # Fallback for centre info if missing in doc
        centre_code = doc.get('centre_code')
        # Fallback for centre and class info if missing in doc
        centre_code = doc.get('centre_code')
        centre_name = doc.get('centre_name')
        student_class = doc.get('student_class')
        
        if not centre_code or not centre_name or not student_class:
            try:
                from django.contrib.auth import get_user_model
                User = get_user_model()
                sid = doc.get('student_id')
                if sid:
                    from bson import ObjectId
                    # Normalize and try lookup
                    sid_norm = str(sid).lower().strip()
                    try:
                        # Djongo often requires actual ObjectId for pk lookups
                        user_obj = User.objects.filter(pk=ObjectId(sid_norm)).first()
                    except:
                        user_obj = None
                    
                    if not user_obj:
                        # Fallback for erp_student_id or admission_number
                        user_obj = User.objects.filter(erp_student_id=sid).first() or \
                                   User.objects.filter(admission_number=sid).first()
                    
                    if user_obj:
                        centre_code = centre_code or getattr(user_obj, 'centre_code', 'N/A')
                        centre_name = centre_name or getattr(user_obj, 'centre_name', 'N/A')
                        
                        # Combine all academic info for complete context
                        e_sec = getattr(user_obj, 'exam_section', '')
                        s_sec = getattr(user_obj, 'study_section', '')
                        c_lvl = getattr(user_obj.class_level, 'name', '') if user_obj.class_level else ''
                        t_exm = getattr(user_obj.target_exam, 'name', '') if user_obj.target_exam else ''
                        
                        # Clean up list-like strings if Djongo returned them as such
                        def clean_sec(s):
                            s = str(s).strip()
                            if s.startswith('[') and s.endswith(']'):
                                try:
                                    import ast
                                    parsed = ast.literal_eval(s)
                                    if isinstance(parsed, list): return ", ".join([str(x) for x in parsed if x])
                                except: pass
                            return s if s and s != '[]' else ''

                        sections = [clean_sec(s) for s in [c_lvl, t_exm, e_sec, s_sec] if clean_sec(s)]
                        student_class = student_class or (" - ".join(sections) if sections else 'N/A')
            except Exception as e:
                print(f"[GrievanceViewSet] Fallback lookup failed: {e}")

        return {
            'id':                   str(doc.get('_id')),
            'student_id':           str(doc.get('student_id') or ''),
            'student_name':         doc.get('student_name') or 'Student',
            'student_email':        getattr(user_obj, 'email', 'N/A') if 'user_obj' in locals() and user_obj else 'N/A',
            'admission_number':     getattr(user_obj, 'admission_number', 'N/A') if 'user_obj' in locals() and user_obj else 'N/A',
            'student_class':        student_class or 'N/A',
            'exam_tag':             getattr(user_obj.target_exam, 'name', 'N/A') if 'user_obj' in locals() and user_obj and user_obj.target_exam else 'N/A',
            'subject':              doc.get('subject') or 'General',
            'category':             doc.get('category') or 'Other',
            'description':          doc.get('description') or '',
            'priority':             doc.get('priority') or 'Medium',
            'status':               doc.get('status') or 'Pending',
            'date':                 date_val,
            'teacher_id':           safe_str(doc.get('teacher_id')),
            'teacher_name':         safe_str(doc.get('teacher_name')),
            'assign_date':          safe_str(doc.get('assign_date')),
            'solved_date':          safe_str(doc.get('solved_date')),
            'solution_description': doc.get('solution_description'),
            'centre_code':          safe_str(centre_code),
            'centre_name':          safe_str(centre_name),
        }

    def list(self, request, *args, **kwargs):
        """
        Bypass Djongo ORM completely for listing — use PyMongo directly.
        Djongo cannot read CharField values back from MongoDB reliably.
        """
        from .db_utils import get_db
        user = request.user
        user_type = getattr(user, 'user_type', '')
        db = get_db()

        if db is None:
            return response.Response([], status=200)

        try:
            collection = db['api_grievance']

            if user_type in ('admin', 'staff', 'superadmin'):
                docs = list(collection.find().sort('date', -1))
            else:
                student_id_str = str(user.pk)
                docs = list(collection.find({'student_id': student_id_str}).sort('date', -1))
                print(f"[GrievanceViewSet] PyMongo list: found {len(docs)} for student_id={student_id_str}")

            formatted = [self._format_doc(doc) for doc in docs]
            return response.Response(formatted)

        except Exception as e:
            print(f"[GrievanceViewSet] PyMongo list failed: {e}")
    def destroy(self, request, *args, **kwargs):
        """
        Block students from deleting grievances.
        """
        user = request.user
        user_type = getattr(user, 'user_type', '')
        
        if user_type == 'student':
            return response.Response(
                {"detail": "Once submitted, grievances cannot be deleted by students for administrative tracking purposes."},
                status=403
            )
        
        return super().destroy(request, *args, **kwargs)

    def perform_create(self, serializer):
        # Automatically set student info if they are a student
        extra_data = {}
        student_name = None
        student_id_str = None

        if self.request.user.user_type == 'student':
            student_name = f"{self.request.user.first_name} {self.request.user.last_name}".strip() if self.request.user.first_name else self.request.user.username
            student_id_str = str(self.request.user.pk)
            extra_data['student_name'] = student_name
            extra_data['student_id'] = student_id_str

            # Default status based on category if not provided
            if 'status' not in self.request.data:
                category = self.request.data.get('category', 'Academic')
                if category in ['Academic', 'Doubt Session']:
                    extra_data['status'] = 'Unassigned'
                else:
                    extra_data['status'] = 'Pending'
            
            # Fetch centre and class info from user
            extra_data['centre_code'] = self.request.user.centre_code
            extra_data['centre_name'] = self.request.user.centre_name
            
            # Combine all available academic info for permanent storage
            e_sec = getattr(self.request.user, 'exam_section', '')
            s_sec = getattr(self.request.user, 'study_section', '')
            c_lvl = getattr(self.request.user.class_level, 'name', '') if self.request.user.class_level else ''
            t_exm = getattr(self.request.user.target_exam, 'name', '') if self.request.user.target_exam else ''
            
            sections = [s for s in [c_lvl, t_exm, e_sec, s_sec] if s]
            extra_data['student_class'] = " - ".join(sections) if sections else 'N/A'

        instance = serializer.save(**extra_data)

        # Djongo silently drops ALL CharField/TextField values on save.
        # Patch the full document via PyMongo to write every field correctly.
        try:
            from .db_utils import get_db
            from datetime import datetime
            db = get_db()
            if db is not None:
                # Build the complete document payload from request + extra_data
                payload = {
                    'subject':      self.request.data.get('subject', ''),
                    'category':     self.request.data.get('category', 'Academic'),
                    'description':  self.request.data.get('description', ''),
                    'priority':     self.request.data.get('priority', 'Medium'),
                    'status':       extra_data.get('status', self.request.data.get('status', 'Pending')),
                    'centre_code':  extra_data.get('centre_code'),
                    'centre_name':  extra_data.get('centre_name'),
                    'student_class': extra_data.get('student_class'),
                }
                if student_id_str:
                    payload['student_id'] = student_id_str
                if student_name:
                    payload['student_name'] = student_name

                result = db['api_grievance'].update_one(
                    {'id': instance.pk},
                    {'$set': payload}
                )
                print(f"[GrievanceViewSet] PyMongo full patch on pk={instance.pk}, matched={result.matched_count}, fields={list(payload.keys())}")
        except Exception as e:
            print(f"[GrievanceViewSet] PyMongo patch failed: {e}")

    def destroy(self, request, *args, **kwargs):
        """
        Delete a grievance directly via PyMongo.
        Uses the same lookup strategy as list() — find by student_id, 
        match id in Python, then delete by MongoDB _id.
        """
        from .db_utils import get_db
        pk = kwargs.get('pk')           # string e.g. '84'
        user = request.user
        user_type = getattr(user, 'user_type', '')

        db = get_db()
        if db is not None:
            try:
                collection = db['api_grievance']

                if user_type in ('admin', 'staff', 'superadmin'):
                    # Admin: find all docs, match by id string comparison
                    all_docs = list(collection.find())
                    target = next(
                        (d for d in all_docs if str(d.get('id', '')) == str(pk)),
                        None
                    )
                else:
                    # Student: only search within their own docs (same as list())
                    student_id_str = str(user.pk)
                    student_docs = list(collection.find({'student_id': student_id_str}))
                    target = next(
                        (d for d in student_docs if str(d.get('id', '')) == str(pk)),
                        None
                    )
                    print(f"[GrievanceViewSet] Delete search: student has {len(student_docs)} docs, looking for id={pk!r}, found={target is not None}")

                if target is None:
                    return response.Response({'detail': 'Not found.'}, status=404)

                # Delete by MongoDB _id — always unique and reliable
                result = collection.delete_one({'_id': target['_id']})
                print(f"[GrievanceViewSet] Deleted pk={pk} by _id={target['_id']}, deleted_count={result.deleted_count}")

                # Cleanup ORM record (safe to fail)
                try:
                    Grievance.objects.get(pk=pk).delete()
                except Exception:
                    pass

                return response.Response(status=204)

            except Exception as e:
                print(f"[GrievanceViewSet] PyMongo delete failed: {e}")
                return response.Response({'detail': str(e)}, status=500)

        return super().destroy(request, *args, **kwargs)

class DoubtViewSet(viewsets.ModelViewSet):
    queryset = Doubt.objects.all()
    serializer_class = DoubtSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Doubt.objects.all()

    @action(detail=False, methods=['get'])
    def unassigned_count(self, request):
        from .db_utils import get_db
        user = request.user
        user_type = getattr(user, 'user_type', '')
        if user_type not in ('admin', 'staff', 'superadmin'):
            return response.Response({'count': 0})
        
        db = get_db()
        if db is None:
            count = Doubt.objects.filter(status__in=['Unassigned', 'Pending']).count()
            return response.Response({'count': count})
        
        try:
            collection = db['api_doubt']
            count = collection.count_documents({'status': {'$in': ['Unassigned', 'Pending']}})
            return response.Response({'count': count})
        except Exception as e:
            print(f"[DoubtViewSet] count_documents failed: {e}")
            count = Doubt.objects.filter(status__in=['Unassigned', 'Pending']).count()
            return response.Response({'count': count})

    # Only fields the list view actually needs — keeps documents small over the wire
    _LIST_PROJECTION = {
        'id': 1, 'student_id': 1, 'student_name': 1, 'student_email': 1,
        'admission_number': 1, 'student_class': 1, 'exam_tag': 1,
        'subject': 1, 'chapter': 1, 'topic': 1, 'title': 1, 'description': 1,
        'status': 1, 'created_at': 1,
        'teacher_name': 1, 'teacher_id': 1, 'assign_date': 1,
        'teacher_reply': 1, 'resolved_at': 1,
        'image': 1, 'image2': 1, 'image3': 1, 'pdf': 1, 'voice_note': 1,
        'reply_image': 1, 'reply_image2': 1, 'reply_image3': 1,
        'reply_pdf': 1, 'reply_voice_note': 1,
        'centre_code': 1, 'centre_name': 1,
    }

    @staticmethod
    def _ensure_indexes(collection):
        """Create MongoDB indexes if they don't already exist. No-op if already present."""
        try:
            collection.create_index([('created_at', -1)], background=True)
            collection.create_index([('status', 1), ('created_at', -1)], background=True)
            collection.create_index([('student_id', 1), ('created_at', -1)], background=True)
            collection.create_index([('teacher_id', 1), ('created_at', -1)], background=True)
        except Exception as e:
            print(f"[DoubtViewSet] Index creation warning: {e}")

    def _build_user_lookup(self, docs):
        """
        Bulk-fetch every User referenced by the given docs in a SINGLE query,
        returning a dict keyed by every string form of the user pk.
        Eliminates the N+1 per-doubt DB query pattern.
        """
        from django.contrib.auth import get_user_model
        from bson import ObjectId as BsonObjectId

        User = get_user_model()
        student_ids = {str(doc.get('student_id', '')).strip() for doc in docs if doc.get('student_id')}
        if not student_ids:
            return {}

        oid_set, str_set = set(), set()
        for sid in student_ids:
            if len(sid) == 24:
                try:
                    oid_set.add(BsonObjectId(sid))
                    continue
                except Exception:
                    pass
            str_set.add(sid)

        users = list(
            User.objects.filter(pk__in=oid_set | str_set)
            .select_related('class_level', 'target_exam')
        )

        lookup = {}
        for u in users:
            for key in [str(u.pk), u.username, u.erp_student_id, u.admission_number]:
                if key:
                    lookup[key] = u
        return lookup

    def _format_doc(self, doc, user_lookup=None):
        """Convert a raw MongoDB document to a clean dict for JSON response."""
        def safe_str(val, default=''):
            return str(val) if val is not None else default

        date_val = doc.get('created_at')
        if date_val and hasattr(date_val, 'isoformat'):
            date_val = date_val.isoformat()

        def get_full_url(path):
            if not path or str(path).strip() == '' or str(path) == 'None':
                return None
            path_str = str(path)
            if 'doubts/' in path_str:
                idx = path_str.find('doubts/')
                if idx != -1:
                    path_str = path_str[idx:]
            if path_str.startswith('http'):
                return path_str
            from django.conf import settings
            media_url = getattr(settings, 'MEDIA_URL', '/media/')
            s3_domain = getattr(settings, 'AWS_S3_CUSTOM_DOMAIN', None)
            if path_str.startswith(media_url):
                path_str = path_str[len(media_url):]
            if s3_domain:
                return f"https://{s3_domain}/{path_str.lstrip('/')}"
            req = self.request
            base_url = f"{req.scheme}://{req.get_host()}"
            return f"{base_url}{media_url}{path_str.lstrip('/')}"

        centre_code      = doc.get('centre_code')
        centre_name      = doc.get('centre_name')
        student_class    = doc.get('student_class')
        student_email    = doc.get('student_email')
        admission_number = doc.get('admission_number')
        exam_tag         = doc.get('exam_tag')

        # O(1) lookup from pre-built dict — no per-doc DB queries
        sid      = str(doc.get('student_id', '')).strip()
        user_obj = (user_lookup or {}).get(sid)

        if user_obj:
            centre_code      = centre_code      or getattr(user_obj, 'centre_code', None)
            centre_name      = centre_name      or getattr(user_obj, 'centre_name', None)
            student_email    = student_email    or getattr(user_obj, 'email', None)
            admission_number = admission_number or getattr(user_obj, 'admission_number', None)
            if not exam_tag:
                try:
                    exam_tag = user_obj.target_exam.name if user_obj.target_exam else None
                except Exception:
                    pass
                exam_tag = exam_tag or getattr(user_obj, 'exam_tag_name', None) or 'N/A'
            if not student_class:
                try:
                    c_lvl = user_obj.class_level.name if user_obj.class_level else ''
                    t_exm = user_obj.target_exam.name if user_obj.target_exam else ''
                    student_class = f"{c_lvl} - {t_exm}".strip(' - ') or 'N/A'
                except Exception:
                    student_class = 'N/A'

        raw_status = doc.get('status', '')
        if raw_status == 'Pending':
            raw_status = 'Unassigned'
        elif raw_status == 'In Progress':
            raw_status = 'Assign'

        return {
            'id':               safe_str(doc.get('id')),
            'student_name':     safe_str(doc.get('student_name')),
            'student_id':       safe_str(doc.get('student_id')),
            'student_email':    student_email    or 'N/A',
            'admission_number': admission_number or 'N/A',
            'student_class':    student_class    or 'N/A',
            'exam_tag':         exam_tag         or 'N/A',
            'subject':          safe_str(doc.get('subject')),
            'chapter':          safe_str(doc.get('chapter')),
            'topic':            safe_str(doc.get('topic')),
            'title':            safe_str(doc.get('title')),
            'description':      safe_str(doc.get('description')),
            'image':            get_full_url(doc.get('image')),
            'image2':           get_full_url(doc.get('image2')),
            'image3':           get_full_url(doc.get('image3')),
            'pdf':              get_full_url(doc.get('pdf')),
            'voice_note':       get_full_url(doc.get('voice_note')),
            'status':           raw_status,
            'created_at':       date_val,
            'teacher_name':     safe_str(doc.get('teacher_name')),
            'teacher_id':       safe_str(doc.get('teacher_id')),
            'assign_date':      safe_str(doc.get('assign_date')),
            'teacher_reply':    safe_str(doc.get('teacher_reply')),
            'resolved_at':      safe_str(doc.get('resolved_at')),
            'reply_image':      get_full_url(doc.get('reply_image')),
            'reply_image2':     get_full_url(doc.get('reply_image2')),
            'reply_image3':     get_full_url(doc.get('reply_image3')),
            'reply_pdf':        get_full_url(doc.get('reply_pdf')),
            'reply_voice_note': get_full_url(doc.get('reply_voice_note')),
            'centre_code':      centre_code or 'N/A',
            'centre_name':      centre_name or 'N/A',
        }

    def list(self, request, *args, **kwargs):
        from .db_utils import get_db
        user      = request.user
        user_type = getattr(user, 'user_type', '')
        db        = get_db()

        if db is None:
            return response.Response([], status=200)

        try:
            collection = db['api_doubt']
            self._ensure_indexes(collection)

            # --- Build the MongoDB filter ---
            mongo_filter = {}

            # Optional status filter from query param (e.g. ?status=Unassigned)
            status_param = request.query_params.get('status', '').strip()
            if status_param:
                # Map frontend tab names → stored DB values
                status_map = {
                    'Unassigned': {'$in': ['Unassigned', 'Pending']},
                    'Assign':     {'$in': ['Assign', 'In Progress']},
                    'Resolved':   'Resolved',
                    'Rejected':   'Rejected',
                }
                mapped = status_map.get(status_param)
                if mapped:
                    mongo_filter['status'] = mapped

            if user_type in ('admin', 'staff', 'superadmin'):
                pass  # no extra filter — all doubts
            elif user_type == 'teacher':
                from django.core.cache import cache
                teachers_cache = cache.get('erp_all_teachers_v6') or []
                teacher_erp_id = None
                for t in teachers_cache:
                    if (t.get('email') and t.get('email').strip().lower() == user.email.strip().lower()) or \
                       (t.get('code') and t.get('code').strip().lower() == user.username.strip().lower()) or \
                       (t.get('code') and t.get('code').strip().lower() == getattr(user, 'employee_id', '').strip().lower()):
                        teacher_erp_id = t.get('id')
                        break

                t_name = f"{user.first_name} {user.last_name}".strip()
                or_queries = []
                if teacher_erp_id:
                    or_queries.append({'teacher_id': teacher_erp_id})
                if t_name:
                    or_queries.append({'teacher_name': {'$regex': f"^{t_name}$", '$options': 'i'}})
                if user.username:
                    or_queries.append({'teacher_name': {'$regex': f"^{user.username}$", '$options': 'i'}})

                if or_queries:
                    mongo_filter['$or'] = or_queries
                else:
                    mongo_filter['teacher_id'] = str(user.pk)
            else:
                mongo_filter['student_id'] = str(user.pk)

            # --- Single MongoDB query with projection ---
            docs = list(
                collection.find(mongo_filter, self._LIST_PROJECTION)
                          .sort('created_at', -1)
            )

            # --- Bulk-fetch all referenced users in ONE DB query ---
            user_lookup = self._build_user_lookup(docs)

            formatted = [self._format_doc(doc, user_lookup) for doc in docs]
            return response.Response(formatted)

        except Exception as e:
            print(f"[DoubtViewSet] PyMongo list failed: {e}")
            return response.Response([], status=200)

    def perform_create(self, serializer):
        student_name = f"{self.request.user.first_name} {self.request.user.last_name}".strip() if self.request.user.first_name else self.request.user.username
        student_id_str = str(self.request.user.pk)
        
        instance = serializer.save(
            student_name=student_name,
            student_id=student_id_str,
            status='Unassigned',
            centre_code=getattr(self.request.user, 'centre_code', ''),
            centre_name=getattr(self.request.user, 'centre_name', '')
        )

        # Djongo patch - Use instance data to be sure
        try:
            from .db_utils import get_db
            db = get_db()
            if db is not None:
                payload = {
                    'subject':      instance.subject,
                    'chapter':      instance.chapter,
                    'topic':        instance.topic,
                    'title':        instance.title,
                    'description':  instance.description,
                    'status':       'Unassigned',
                    'student_id':   student_id_str,
                    'student_name': student_name,
                    'centre_code':  getattr(self.request.user, 'centre_code', ''),
                    'centre_name':  getattr(self.request.user, 'centre_name', '')
                }
                
                for field in ['image', 'image2', 'image3', 'pdf', 'voice_note']:
                    val = getattr(instance, field, None)
                    if val:
                        try:
                            payload[field] = val.name
                        except:
                            payload[field] = str(val)

                db['api_doubt'].update_one(
                    {'id': instance.pk},
                    {'$set': payload}
                )
        except Exception as e:
            print(f"[DoubtViewSet] PyMongo patch failed: {e}")

    def _sync_to_mongo(self, instance):
        """Helper to ensure ORM updates are pushed to MongoDB PyMongo-style"""
        try:
            from .db_utils import get_db
            db = get_db()
            if db is not None:
                payload = {
                    'status':         instance.status,
                    'teacher_name':   instance.teacher_name,
                    'teacher_id':     instance.teacher_id,
                    'assign_date':    instance.assign_date.isoformat() if instance.assign_date and hasattr(instance.assign_date, 'isoformat') else instance.assign_date,
                    'teacher_reply':  instance.teacher_reply,
                    'resolved_at':    instance.resolved_at.isoformat() if instance.resolved_at and hasattr(instance.resolved_at, 'isoformat') else instance.resolved_at,
                }
                # Also include basic fields just in case they were edited
                for field in ['subject', 'chapter', 'topic', 'title', 'description']:
                    val = getattr(instance, field, None)
                    if val is not None:
                        payload[field] = val
                
                # Sync file URLs for student question attachments
                for field in ['image', 'image2', 'image3', 'pdf', 'voice_note',
                              'reply_image', 'reply_image2', 'reply_image3', 'reply_pdf', 'reply_voice_note']:
                    val = getattr(instance, field, None)
                    if val:
                        try:
                            payload[field] = val.name
                        except:
                            payload[field] = str(val)

                db['api_doubt'].update_one(
                    {'id': instance.pk},
                    {'$set': payload}
                )
        except Exception as e:
            print(f"[DoubtViewSet] Sync to Mongo failed: {e}")

    def perform_update(self, serializer):
        instance = serializer.save()
        self._sync_to_mongo(instance)

    def partial_update(self, request, *args, **kwargs):
        resp = super().partial_update(request, *args, **kwargs)
        # The super call triggers perform_update which calls our sync
        return resp

    def destroy(self, request, *args, **kwargs):
        from .db_utils import get_db
        pk = kwargs.get('pk')
        user = request.user
        user_type = getattr(user, 'user_type', '')

        db = get_db()
        if db is not None:
            try:
                collection = db['api_doubt']
                if user_type in ('admin', 'staff', 'superadmin'):
                    all_docs = list(collection.find())
                    target = next((d for d in all_docs if str(d.get('id', '')) == str(pk)), None)
                else:
                    student_id_str = str(user.pk)
                    student_docs = list(collection.find({'student_id': student_id_str}))
                    target = next((d for d in student_docs if str(d.get('id', '')) == str(pk)), None)

                if target:
                    collection.delete_one({'_id': target['_id']})
                    try:
                        Doubt.objects.get(pk=pk).delete()
                    except:
                        pass
                    return response.Response(status=204)
            except Exception as e:
                print(f"[DoubtViewSet] PyMongo delete failed: {e}")
        
        return super().destroy(request, *args, **kwargs)


class StudyTaskViewSet(viewsets.ModelViewSet):
    serializer_class = StudyTaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Only return tasks for the logged in user
        return StudyTask.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class NoticeViewSet(viewsets.ModelViewSet):
    queryset = Notice.objects.all()
    serializer_class = NoticeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Return all public notices AND private notices for this user
        # SIMPLIFICATION: usage of Q objects (OR) triggers RecursionError in some Djongo versions.
        # We will fetch potentially more data and filter in memory if needed, or just prioritize safety.
        try:
             # Try the standard OR query first
            from django.db.models import Q
            return Notice.objects.filter(Q(user__isnull=True) | Q(user=self.request.user))
        except Exception:
            # Fallback: just return all and let the serializer/frontend handle it, 
            # or return just user's notices to be safe.
            print("NoticeViewSet: Q-object query failed, falling back to simple filter")
            return Notice.objects.filter(user=self.request.user)

    def list(self, request, *args, **kwargs):
        # Check for upcoming tasks and generate notices
        try:
            if request.user.user_type == 'student':
                from datetime import datetime
                from django.utils import timezone
                
                now = timezone.now()
                # Use a simpler query to avoid Djongo recursion issues
                # Fetch tasks by date and user first
                date_tasks = StudyTask.objects.filter(
                    user=request.user,
                    date=now.date()
                )
                
                # In-memory filtering (safe from Djongo parser bugs)
                upcoming_tasks = [t for t in date_tasks if not t.completed]
                
                for task in upcoming_tasks:
                    # Combine date and time to compare
                    task_dt = datetime.combine(task.date, task.time)
                    if timezone.is_aware(now):
                        try:
                            # Try to make it timezone aware, assuming simple default
                            from django.utils.timezone import make_aware
                            task_dt = make_aware(task_dt)
                        except:
                            # Fallback if already aware or other issue
                            pass
                    
                    # Calculate difference in minutes
                    # Ensure both are offset-aware or offset-naive before subtracting
                    if task_dt.tzinfo is None and now.tzinfo is not None:
                         # Make task_dt aware
                         from django.utils.timezone import make_aware
                         # Provide a default timezone if unexpected
                         task_dt = make_aware(task_dt, timezone.get_current_timezone())
                    elif task_dt.tzinfo is not None and now.tzinfo is None:
                         # removing tz from task_dt
                         task_dt = task_dt.replace(tzinfo=None)
                         
                    time_diff = (task_dt - now).total_seconds() / 60
                    
                    if 0 < time_diff <= 30:
                        # Check if notice already exists
                        exists = Notice.objects.filter(
                            user=request.user,
                            title=f"Reminder: {task.topic}",
                            date=now.date()
                        ).exists()
                        
                        if not exists:
                            Notice.objects.create(
                                user=request.user,
                                title=f"Reminder: {task.topic}",
                                content=f"Your study session for '{task.subject} - {task.topic}' starts in {int(time_diff)} minutes.",
                                category='System',
                                is_new=True
                            )
        except Exception as e:
            # Catch errors silently so the notice board still loads even if reminder gen fails
            print(f"Error generating study reminders: {e}")

        # MANUALLY COMBINE PUBLIC AND PRIVATE NOTICES
        # This avoids the OR query (Q objects) which triggers RecursionError in Djongo
        try:
            # Public/General notices (no user assigned)
            public_notices_query = Notice.objects.filter(user__isnull=True)
            
            if request.user.user_type == 'student':
                from api.db_utils import parse_section
                exam_sections = parse_section(getattr(request.user, 'exam_section', None))
                from django.db.models import Q
                
                # Filter for: (is_general=True) OR (no specific section) OR (matching student section)
                section_filter = Q(is_general=True) | Q(targeted_section__isnull=True) | Q(targeted_section="")
                if exam_sections:
                    section_filter |= Q(targeted_section__in=exam_sections)
                
                public_notices = list(public_notices_query.filter(section_filter))
                print(f"[DEBUG] Found {len(public_notices)} targeted/general notices for section: {exam_sections}")
            else:
                public_notices = list(public_notices_query)

            # Private notices (specifically for this user)
            user_notices = list(Notice.objects.filter(user=request.user))
            
            all_notices = public_notices + user_notices
            
            # Sort manually if needed (e.g. by created_at desc)
            # Assuming created_at exists, otherwise skip sort or inspect model
            try:
                all_notices.sort(key=lambda x: x.created_at, reverse=True)
            except AttributeError:
                pass # Model might not have created_at
            
            serializer = self.get_serializer(all_notices, many=True)
            return response.Response(serializer.data)
        except Exception as e:
            # Last resort fallback if manual combo fails
            print(f"Error manually combining notices: {e}")
            return response.Response([])

class UserSearchView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('q', '')
        if len(query) < 2:
            return response.Response([])

        from django.db.models import Q
        users = CustomUser.objects.filter(
            Q(username__icontains=query) |
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query) |
            Q(email__icontains=query)
        ).exclude(pk=request.user.pk)[:10]

        data = [{
            'id': str(u.pk),
            'username': u.username,
            'name': f"{u.first_name} {u.last_name}".strip() or u.username,
            'user_type': u.user_type
        } for u in users]

        return response.Response(data)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def temporary_cleanup_view(request):
    """Temporary admin tool to wipe corrupted %(0 entries"""
    if not request.user.is_staff and request.user.user_type != 'student':
        return response.Response({"error": "Unauthorized"}, status=403)
        
    from .models import Grievance
    count1 = Grievance.objects.filter(student_name__icontains='%').delete()[0]
    count2 = Grievance.objects.filter(student_name='%(0').delete()[0]
    count3 = Grievance.objects.filter(subject__isnull=True).delete()[0]
    count4 = Grievance.objects.filter(subject='').delete()[0]
    
    return response.Response({
        "status": "success",
        "deleted_count": count1 + count2 + count3 + count4,
        "details": {
            "percent_matches": count1,
            "literal_matches": count2,
            "null_subjects": count3,
            "empty_subjects": count4
        }
    })

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def cleanup_duplicate_users_view(request):
    """Admin tool to resolve 'MultipleObjectsReturned' by wiping duplicate usernames"""
    if not request.user.is_staff and not request.user.is_superuser:
         return response.Response({"error": "Unauthorized. Staff only."}, status=403)

    from .models import CustomUser
    from django.db.models import Count
    
    # Simple Python-side lookup to be safe with Djongo
    all_users = list(CustomUser.objects.all())
    from collections import Counter
    counts = Counter([u.username for u in all_users])
    duplicates = [name for name, count in counts.items() if count > 1 and name]
    
    report = []
    total_deleted = 0
    
    for username in duplicates:
        # Keep the most recently updated/created one
        user_list = list(CustomUser.objects.filter(username=username).order_by('-pk')) 
        keep = user_list[0]
        to_delete = user_list[1:]
        
        del_count = 0
        for dupe in to_delete:
            dupe.delete()
            del_count += 1
            total_deleted += 1
            
        report.append({
            "username": username,
            "kept_id": str(keep.pk),
            "deleted_count": del_count
        })
        
        return response.Response({
        "status": "success",
        "total_deleted": total_deleted,
        "duplicates_processed": report
    })

class StudentPsychometricProfileView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            from .db_utils import get_db
            db = get_db()
            if db is not None:
                doc = db['api_studentpsychometricprofile'].find_one({'user_id': request.user.pk})
                if doc:
                    # Format for frontend
                    return response.Response({
                        'id':             str(doc.get('id', '')),
                        'classification': doc.get('classification', ''),
                        'traits':         doc.get('traits', []),
                        'summary':        doc.get('summary', ''),
                        'raw_responses':  doc.get('raw_responses', {}),
                        'created_at':     doc.get('created_at'),
                    })
        except Exception as e:
            print(f"[PsychometricView] PyMongo get failed: {e}")

        # Fallback to ORM
        profile = StudentPsychometricProfile.objects.filter(user=request.user).first()
        if profile:
            serializer = StudentPsychometricProfileSerializer(profile)
            return response.Response(serializer.data)
        return response.Response(None, status=status.HTTP_200_OK)

    def post(self, request):
        profiles = StudentPsychometricProfile.objects.filter(user=request.user).order_by('-created_at')
        if profiles.exists():
            profile = profiles.first()
            # Clean up duplicates created by race conditions
            if profiles.count() > 1:
                for p in profiles[1:]:
                    p.delete()
            serializer = StudentPsychometricProfileSerializer(profile, data=request.data, partial=True)
        else:
            serializer = StudentPsychometricProfileSerializer(data=request.data)
            
        if serializer.is_valid():
            instance = serializer.save(user=request.user)
            
            # Djongo Field Dropping Patch
            try:
                from .db_utils import get_db
                db = get_db()
                if db is not None:
                    payload = {
                        'classification': request.data.get('classification', ''),
                        'traits':         request.data.get('traits', []),
                        'summary':        request.data.get('summary', ''),
                        'raw_responses':  request.data.get('raw_responses', {}),
                        'user_id':        request.user.pk
                    }
                    db['api_studentpsychometricprofile'].update_one(
                        {'id': instance.pk},
                        {'$set': payload},
                        upsert=True
                    )
            except Exception as e:
                print(f"[PsychometricView] Patch failed: {e}")

            return response.Response(serializer.data, status=status.HTTP_201_CREATED)
        return response.Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class AdminStudentPsychometricProfileView(views.APIView):
    permission_classes = [permissions.IsAuthenticated] # Assuming admin validation is handled by UI/middleware or could add IsAdminUser if standard

    def get(self, request, email):
        try:
            from .db_utils import get_db
            from django.contrib.auth import get_user_model
            User = get_user_model()
            
            user = User.objects.filter(email__iexact=email).first()
            if not user:
                return response.Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

            db = get_db()
            if db is not None:
                doc = db['api_studentpsychometricprofile'].find_one({'user_id': user.pk})
                if doc:
                    return response.Response({
                        'id':             str(doc.get('id', '')),
                        'classification': doc.get('classification', ''),
                        'traits':         doc.get('traits', []),
                        'summary':        doc.get('summary', ''),
                        'raw_responses':  doc.get('raw_responses', {}),
                        'created_at':     doc.get('created_at'),
                    })
        except Exception as e:
            print(f"[AdminPsychometricView] PyMongo get failed: {e}")

        # Fallback to ORM
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            user = User.objects.filter(email__iexact=email).first()
            if not user:
                return response.Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
                
            profile = StudentPsychometricProfile.objects.filter(user=user).first()
            if profile:
                serializer = StudentPsychometricProfileSerializer(profile)
                return response.Response(serializer.data)
        except Exception as e:
            pass
            
        return response.Response(None, status=status.HTTP_200_OK)

    def delete(self, request, email):
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            user = User.objects.filter(email__iexact=email).first()
            
            if not user:
                return response.Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

            # Delete from ORM
            StudentPsychometricProfile.objects.filter(user=user).delete()

            # Delete from PyMongo
            try:
                from .db_utils import get_db
                db = get_db()
                if db is not None:
                    db['api_studentpsychometricprofile'].delete_many({'user_id': user.pk})
            except Exception as e:
                print(f"[AdminPsychometricView] PyMongo delete failed: {e}")

            return response.Response({"status": "success"}, status=status.HTTP_200_OK)
        except Exception as e:
            return response.Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AdminAllPsychometricProfilesView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            
            # Fetch from ORM (latest first)
            profiles = StudentPsychometricProfile.objects.select_related('user').order_by('-created_at')
            
            data = []
            seen_users = set()
            for profile in profiles:
                if profile.user_id in seen_users:
                    continue
                seen_users.add(profile.user_id)
                
                user = profile.user
                
                # Default data
                item = {
                    'email': user.email if user else '',
                    'name': f"{user.first_name} {user.last_name}".strip() if user else 'Unknown',
                    'id': profile.id,
                    'classification': profile.classification,
                    'traits': profile.traits,
                    'summary': profile.summary,
                    'raw_responses': profile.raw_responses,
                    'created_at': profile.created_at,
                }
                data.append(item)
                
            return response.Response(data, status=status.HTTP_200_OK)
        except Exception as e:
            return response.Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class StudentStudyPlannerConfigView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        latest_plan = None
        has_previous_plan = False
        try:
            from .models import StudentMasterPlan
            prev_plan = StudentMasterPlan.objects.filter(user=request.user).order_by('-created_at').first()
            if prev_plan:
                has_previous_plan = True
                latest_plan = {
                    'content': prev_plan.master_plan,
                    'test_id': prev_plan.test_id,
                    'created_at': prev_plan.created_at,
                    'target_college': prev_plan.target_college
                }
        except Exception:
            pass

        try:
            from .db_utils import get_db
            db = get_db()
            if db is not None:
                doc = db['api_studentstudyplannerconfig'].find_one({'user_id': request.user.pk})
                if doc:
                    return response.Response({
                        'id':             str(doc.get('_id', '')),
                        'target_college': doc.get('target_college', {}),
                        'target_career':  doc.get('target_career', ''),
                        'updated_at':     doc.get('updated_at'),
                        'has_previous_plan': has_previous_plan,
                        'latest_plan': latest_plan
                    })
        except Exception as e:
            print(f"[PlannerConfigView] PyMongo get failed: {e}")

        from bson import ObjectId
        
        user_id = request.user.pk
        if isinstance(user_id, str) and len(user_id) == 24:
            user_id = ObjectId(user_id)
            
        config = StudentStudyPlannerConfig.objects.filter(user_id=user_id).first()
        if config:
            serializer = StudentStudyPlannerConfigSerializer(config)
            data = serializer.data
            data['has_previous_plan'] = has_previous_plan
            data['latest_plan'] = latest_plan
            return response.Response(data)
        return response.Response({
            'has_previous_plan': has_previous_plan,
            'latest_plan': latest_plan
        }, status=status.HTTP_200_OK)

    def post(self, request):
        from bson import ObjectId
        
        user_id = request.user.pk
        if isinstance(user_id, str) and len(user_id) == 24:
            user_id = ObjectId(user_id)
            
        try:
            from .db_utils import get_db
            db = get_db()
            if db is not None:
                from datetime import datetime
                db['api_studentstudyplannerconfig'].update_one(
                    {'user_id': user_id},
                    {'$set': {
                        'target_college': request.data.get('target_college', {}),
                        'target_career':  request.data.get('target_career', ''),
                        'user_id':        user_id,
                        'updated_at':     datetime.utcnow()
                    }},
                    upsert=True
                )
        except Exception as e:
            print(f"[PlannerConfigView] PyMongo save failed: {e}")
            return response.Response({"error": "Failed to save"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return response.Response(request.data, status=status.HTTP_200_OK)

class UserActivityLogViewSet(viewsets.ModelViewSet):
    serializer_class = UserActivityLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserActivityLog.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_student_activity_analytics(request):
    try:
        from django.utils import timezone
        from datetime import timedelta
        from collections import defaultdict
        import requests
        from .erp_views import _get_erp_url, _get_erp_admin_token, _fetch_erp_student_id

        user = request.user
        now = timezone.now()
        last_35_days = now - timedelta(days=35)

        # Fetch raw logs — avoid ORM date-cast (Djongo/MongoDB incompatible)
        heartbeat_logs = list(UserActivityLog.objects.filter(
            user=user,
            activity_type='heartbeat'
        ).values('timestamp', 'duration', 'path'))

        # 1. Total study time
        total_seconds = sum(log['duration'] or 0 for log in heartbeat_logs)
        total_hours = round(total_seconds / 3600, 1)

        # 2. Per-day intensity map for heatmap (Python-side grouping)
        intensity_map = defaultdict(int)  # date -> total seconds
        for log in heartbeat_logs:
            ts = log['timestamp']
            if ts and ts >= last_35_days:
                day = ts.date()
                intensity_map[day] += log['duration'] or 0

        heatmap_data = []
        for i in range(35):
            date = (now - timedelta(days=34 - i)).date()
            seconds = intensity_map.get(date, 0)
            intensity = 0
            if seconds > 0:
                hours = seconds / 3600
                if hours < 1:   intensity = 1
                elif hours < 3: intensity = 2
                elif hours < 6: intensity = 3
                else:           intensity = 4
            heatmap_data.append({
                'day': date.strftime('%d %b'),
                'intensity': intensity,
                'active': seconds > 0,
                'hours': round(seconds / 3600, 2)
            })

        # 3. Time distribution by section (Python-side grouping)
        path_seconds = defaultdict(int)
        for log in heartbeat_logs:
            path_seconds[log.get('path') or 'unknown'] += log['duration'] or 0

        total_dist_sec = sum(path_seconds.values()) or 1
        colors = ['bg-indigo-500', 'bg-orange-500', 'bg-blue-500', 'bg-emerald-500', 'bg-slate-400']
        sorted_paths = sorted(path_seconds.items(), key=lambda x: x[1], reverse=True)[:5]

        distribution = []
        for idx, (path, sec) in enumerate(sorted_paths):
            # Better topic extraction: "StudentPortal/Video-Content" -> "Video Content"
            parts = [p for p in path.split('/') if p and p != 'StudentPortal']
            name = parts[-1].replace('-', ' ').title() if parts else 'Dashboard'
            
            distribution.append({
                'topic': name,
                'time': f"{round(sec / 3600, 1)} hrs",
                'percent': int((sec / total_dist_sec) * 100),
                'color': colors[idx % len(colors)]
            })

        # 4. Streak calculation (Python-side)
        active_dates = sorted(intensity_map.keys(), reverse=True)
        streak = 0
        if active_dates:
            check_date = now.date()
            for date in active_dates:
                if date == check_date:
                    streak += 1
                    check_date -= timedelta(days=1)
                elif date > check_date:
                    continue
                else:
                    break

        # 5. Real proficiency from ERP
        proficiency = []
        try:
            erp_sid = _fetch_erp_student_id(user)
            if erp_sid:
                erp_url = _get_erp_url()
                erp_token = _get_erp_admin_token()
                if erp_token:
                    report_resp = requests.get(
                        f"{erp_url}/api/student-portal/report",
                        headers={"Authorization": f"Bearer {erp_token}"},
                        params={"studentId": erp_sid},
                        timeout=10
                    )
                    if report_resp.status_code == 200:
                        report_data = report_resp.json()
                        swp = report_data.get('data', {}).get('subjectWisePerformance', [])
                        if not swp:
                            swp = report_data.get('subjectWisePerformance', [])
                        for item in swp[:4]:
                            proficiency.append({
                                'subject': item.get('subjectName') or item.get('subject') or 'Unknown',
                                'score': int(item.get('percentage') or item.get('score') or 0),
                                'trend': '+0%',
                                'subtopics': []
                            })
        except Exception as erp_err:
            print(f"[Analytics] ERP Score Fetch Error: {erp_err}")

        if not proficiency:
            # Default subjects for this portal
            proficiency = [
                {'subject': 'Physics',     'score': 0, 'trend': '+0%', 'subtopics': []},
                {'subject': 'Chemistry',   'score': 0, 'trend': '+0%', 'subtopics': []},
                {'subject': 'Mathematics', 'score': 0, 'trend': '+0%', 'subtopics': []},
                {'subject': 'Biology',     'score': 0, 'trend': '+0%', 'subtopics': []},
            ]

        # 5.5 Merge activity-based subjects into proficiency if they are missing
        # This ensures if a user watches a Bio video, it shows up
        existing_subjects = {p['subject'].lower() for p in proficiency}
        for dist_item in distribution:
            topic = dist_item['topic']
            # If the topic looks like a subject and isn't there, add it with a small engagement score
            if topic.lower() not in existing_subjects and topic.lower() in ['biology', 'english', 'history']:
                proficiency.append({
                    'subject': topic,
                    'score': min(15, dist_item['percent']), # Use percentage as a proxy for engagement
                    'trend': '+ engagement',
                    'subtopics': []
                })
            elif topic.lower() in existing_subjects:
                # Boost existing scores slightly based on engagement if they are 0
                for p in proficiency:
                    if p['subject'].lower() == topic.lower() and p['score'] == 0:
                        p['score'] = min(20, dist_item['percent'])
                        p['trend'] = '+ engagement'

        # 6. Summary stats — count unique videos watched (not raw play events)
        # Raw play events include replays and events with no video_id; unique videos
        # is what makes sense to show as "Videos Accessed"
        active_days = len(intensity_map)
        unique_sections = len(path_seconds)
        all_play_events = list(UserActivityLog.objects.filter(
            user=user, activity_type='video_play'
        ).values_list('metadata', flat=True))
        unique_video_ids = {
            m.get('video_id') for m in all_play_events
            if isinstance(m, dict) and m.get('video_id')
        }
        video_plays = len(unique_video_ids)


        # 7. Recent video activity (Deduplicated)
        all_play_logs = list(UserActivityLog.objects.filter(
            user=user, activity_type='video_play'
        ).order_by('-timestamp'))
        
        all_video_logs = list(UserActivityLog.objects.filter(
            user=user, activity_type__startswith='video_'
        ))
        
        recent_videos_data = []
        seen_ids = set()
        
        for rlog in all_play_logs:
            v_id = rlog.metadata.get('video_id')
            if not v_id or v_id in seen_ids:
                continue
            
            seen_ids.add(v_id)
            total_sec = sum(v.duration for v in all_video_logs if v.metadata.get('video_id') == v_id)
            
            recent_videos_data.append({
                'title': rlog.metadata.get('video_title', 'Unknown Video'),
                'timestamp': rlog.timestamp,
                'id': v_id,
                'duration_watched': f"{round(total_sec / 60, 1)} min"
            })
            if len(recent_videos_data) >= 5:
                break

        return response.Response({
            'total_hours': total_hours,
            'heatmap': heatmap_data,
            'distribution': distribution,
            'streak': streak,
            'avg_daily_hours': round(total_hours / max(active_days, 1), 1) if active_days else 0,
            'proficiency': proficiency,
            'summary': {
                'active_days': active_days,
                'unique_sections': unique_sections,
                'video_plays': video_plays,
                'total_hours': total_hours
            },
            'recent_videos': recent_videos_data
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return response.Response({"error": str(e)}, status=500)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_student_curriculum_progress(request):
    """
    Returns a detailed breakdown of the curriculum (Subject -> Chapter -> Topic)
    and the student's completion status for each.
    """
    try:
        user = request.user
        
        # 1. Fetch all LibraryItems relevant to this student
        # We filter by Class Level and Target Exam to match the student's curriculum
        items_query = LibraryItem.objects.all()
        if hasattr(user, 'class_level') and user.class_level:
            items_query = items_query.filter(Q(class_level=user.class_level) | Q(class_level__isnull=True))
        if hasattr(user, 'target_exam') and user.target_exam:
            items_query = items_query.filter(Q(target_exams=user.target_exam) | Q(target_exams__isnull=True))
            
        items = items_query.select_related('subject', 'chapter', 'topic').prefetch_related('videos').order_by('subject__name', 'chapter__name', 'topic__sort_order')
        
        # 2. Get Student Activity (Video Watch History)
        activity_logs = list(UserActivityLog.objects.filter(
            user=user, activity_type__startswith='video_'
        ))
        watched_video_ids = set()
        watched_video_titles = set()
        for log in activity_logs:
            v_id = log.metadata.get('video_id')
            v_title = log.metadata.get('video_title')
            if v_id: 
                watched_video_ids.add(str(v_id))
            if v_title:
                watched_video_titles.add(str(v_title).strip().lower())
            
        # 3. Build the hierarchical structure: Subject -> Chapter -> Topics (Grouped by name)
        structure = {}
        for item in items:
            subj_name = item.subject.name if item.subject else 'General Resources'
            chap_name = item.chapter.name if item.chapter else 'Introduction'
            topic_display_name = item.topic.name if item.topic else item.title
            
            if subj_name not in structure:
                structure[subj_name] = {}
            if chap_name not in structure[subj_name]:
                structure[subj_name][chap_name] = {} # Use dict for deduplication
            
            # Get video-level data for this item
            videos_data = []
            item_videos = list(item.videos.all())
            has_videos = len(item_videos) > 0
            
            status = 'not_started'
            item_prefix = f"{item.id}-v-"
            
            for idx, v in enumerate(item_videos):
                v_id_erp = f"{item.id}-V-{idx}".lower()
                v_id_erp_upper = f"{item.id}-V-{idx}".upper()
                v_id_model = str(v.id).lower()
                v_title_lower = (v.title or "").strip().lower()
                
                v_status = 'not_started'
                watched_video_ids_lower = {str(vid).lower() for vid in watched_video_ids}
                if (v_id_erp in watched_video_ids_lower or 
                    v_id_erp_upper in watched_video_ids_lower or 
                    v_id_model in watched_video_ids_lower or
                    (v_title_lower and v_title_lower in watched_video_titles)):
                    v_status = 'completed'
                    status = 'completed' # If any video is watched, topic is in_progress/completed
                
                v_watch_time = sum(log.duration for log in activity_logs 
                                 if str(log.metadata.get('video_id')).lower() == v_id_erp or 
                                    str(log.metadata.get('video_id')).lower() == v_id_model or
                                    (v_title_lower and str(log.metadata.get('video_title', '')).strip().lower() == v_title_lower))
                
                videos_data.append({
                    'title': v.title or f"Video {idx+1}",
                    'status': v_status,
                    'duration_watched': f"{round(v_watch_time / 60, 1)} min" if v_watch_time > 0 else "0 min"
                })

            # Grouping Logic: If topic exists, update status/videos
            if topic_display_name in structure[subj_name][chap_name]:
                existing = structure[subj_name][chap_name][topic_display_name]
                if status == 'completed':
                    existing['status'] = 'completed'
                existing['videos'].extend(videos_data)
            else:
                structure[subj_name][chap_name][topic_display_name] = {
                    'name': topic_display_name,
                    'status': status,
                    'has_video': has_videos,
                    'videos': videos_data
                }
            
        # 4. Transform into a list-based format suitable for the frontend
        formatted_result = []
        for s_name in sorted(structure.keys()):
            chapters_data = structure[s_name]
            chap_list = []
            
            subj_total_topics = 0
            subj_completed_topics = 0
            
            for c_name in sorted(chapters_data.keys()):
                # Convert topics dict to list
                topics = list(chapters_data[c_name].values())
                
                completed_count = sum(1 for t in topics if t['status'] == 'completed')
                total_count = len(topics)
                
                subj_total_topics += total_count
                subj_completed_topics += completed_count
                
                chap_list.append({
                    'name': c_name,
                    'topics': topics,
                    'completed_count': completed_count,
                    'total_count': total_count,
                    'progress': round((completed_count / total_count) * 100) if total_count > 0 else 0
                })
            
            formatted_result.append({
                'subject': s_name,
                'progress': round((subj_completed_topics / subj_total_topics) * 100) if subj_total_topics > 0 else 0,
                'chapters': chap_list
            })
            
        return response.Response(formatted_result)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return response.Response({"error": str(e)}, status=500)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_swot_analysis(request):
    try:
        from .swot_analytics import calculate_swot_data
        data = calculate_swot_data(request.user)
        return response.Response(data)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return response.Response({"error": str(e)}, status=500)

