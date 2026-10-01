from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import ChapterTestResult
from .serializers import ChapterTestResultSerializer

class ChapterTestResultViewSet(viewsets.ModelViewSet):
    serializer_class = ChapterTestResultSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        user_type = getattr(user, 'user_type', None)
        if user.is_staff or user.is_superuser or user_type in ('admin', 'superadmin', 'staff', 'teacher'):
            assigned = getattr(user, 'assigned_centres', None)
            if assigned and isinstance(assigned, list) and len(assigned) > 0 and user_type != 'superadmin' and not user.is_superuser:
                centre_keys = []
                for c in assigned:
                    if isinstance(c, dict):
                        if c.get('name'): centre_keys.append(str(c['name']).strip().lower())
                        if c.get('code'): centre_keys.append(str(c['code']).strip().lower())
                    elif isinstance(c, str):
                        centre_keys.append(c.strip().lower())
                
                all_results = ChapterTestResult.objects.select_related('student').all()
                if not centre_keys:
                    return all_results
                
                matching_ids = []
                for r in all_results:
                    std = getattr(r, 'student', None)
                    if std:
                        std_cname = (getattr(std, 'centre_name', '') or '').strip().lower()
                        std_ccode = (getattr(std, 'centre_code', '') or '').strip().lower()
                        if any(ck in std_cname or ck in std_ccode or (std_cname and std_cname in ck) for ck in centre_keys):
                            matching_ids.append(r.pk)
                
                return ChapterTestResult.objects.filter(pk__in=matching_ids)

            return ChapterTestResult.objects.all()
        # Only return results for the logged-in student
        return ChapterTestResult.objects.filter(student=user)

    @action(detail=True, methods=['post'], url_path='save_reflections')
    def save_reflections(self, request, pk=None):
        result = self.get_object()
        user = request.user
        user_type = getattr(user, 'user_type', None)
        is_staff_or_admin = user.is_staff or user.is_superuser or user_type in ('admin', 'superadmin', 'staff', 'teacher')
        
        # Check permissions: student can only update their own result unless admin/staff
        if not is_staff_or_admin and result.student != user:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        reflections_data = request.data.get('reflections')
        question_id = request.data.get('question_id')
        reflection = request.data.get('reflection')

        current = result.reflections or {}
        if not isinstance(current, dict):
            current = {}

        if isinstance(reflections_data, dict):
            for q_id, r_val in reflections_data.items():
                current[str(q_id)] = r_val
        elif question_id:
            current[str(question_id)] = reflection or ''
        else:
            return Response({'error': 'No reflections provided'}, status=status.HTTP_400_BAD_REQUEST)

        result.reflections = current
        result.save()
        return Response({'status': 'success', 'reflections': result.reflections})
