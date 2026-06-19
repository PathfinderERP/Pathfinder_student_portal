from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Centre
from .serializers import CentreSerializer
from bson import ObjectId

class CentreViewSet(viewsets.ModelViewSet):
    queryset = Centre.objects.all()
    serializer_class = CentreSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        pk = self.kwargs.get('pk')
        try:
            return Centre.objects.get(pk=ObjectId(pk))
        except (Centre.DoesNotExist, Exception):
            from django.shortcuts import get_object_or_404
            return get_object_or_404(Centre, pk=pk)

    @action(detail=False, methods=['POST'], url_path='sync')
    def sync(self, request):
        user = request.user
        user_type = getattr(user, 'user_type', '')
        if not (user.is_staff or user.is_superuser or user_type in ('admin', 'superadmin', 'staff')):
            return Response({"error": "Permission denied. Only administrators can sync centres."}, status=status.HTTP_403_FORBIDDEN)

        import requests
        from django.core.cache import cache
        from api.erp_views import _get_erp_url, _get_erp_admin_token, sync_local_centres_with_erp

        try:
            erp_url = _get_erp_url()
            erp_token = _get_erp_admin_token(force_refresh=True)
            
            if not erp_token:
                return Response({"error": "ERP Authentication Failed. Token unavailable."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            resp = requests.get(f"{erp_url}/api/centre", headers={"Authorization": f"Bearer {erp_token}"}, timeout=30)
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, dict):
                    data = data.get('data') or data.get('centres') or data
                
                raw_data = data if isinstance(data, list) else [data]
                
                # Deduplicate by enterCode or code to match get_all_centres_erp_data
                seen_codes = set()
                final_data = []
                for item in raw_data:
                    if not isinstance(item, dict): continue
                    code = item.get('enterCode') or item.get('code')
                    if not code:
                        code = f"{item.get('centreName')}_{item.get('state')}"
                    
                    if code and code not in seen_codes:
                        final_data.append(item)
                        seen_codes.add(code)
                
                if final_data:
                    # Update ERP centres cache as well
                    cache.set('erp_all_centres_v1', final_data, 86400)
                    
                    created, updated = sync_local_centres_with_erp(final_data)
                    return Response({
                        "status": "success",
                        "message": f"Successfully synced {len(final_data)} centres from ERP.",
                        "created_count": created,
                        "updated_count": updated
                    }, status=status.HTTP_200_OK)
                
                return Response({"error": "No centres data returned from ERP."}, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({"error": f"ERP returned error status {resp.status_code}."}, status=status.HTTP_502_BAD_GATEWAY)
        except Exception as e:
            return Response({"error": f"Sync failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
