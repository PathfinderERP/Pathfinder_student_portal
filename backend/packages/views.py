from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from .models import Package
from .serializers import PackageSerializer
from django.db.models import Q
from bson import ObjectId

class PackageViewSet(viewsets.ModelViewSet):
    queryset = Package.objects.all()
    serializer_class = PackageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Package.objects.all()

    def get_object(self):
        """
        Explicitly handle ObjectId conversion to prevent 404 errors with Djongo.
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
            except (Package.DoesNotExist, Exception):
                pass
        
        return super().get_object()

    def list(self, request, *args, **kwargs):
        # Handle the custom list logic here to bypass Djongo's boolean filter bug
        all_packages = list(Package.objects.all())
        active_packages = [pkg for pkg in all_packages if pkg.is_active]
        
        search = self.request.query_params.get('search', None)
        if search:
            search_lower = search.lower()
            active_packages = [
                pkg for pkg in active_packages 
                if search_lower in pkg.name.lower() or search_lower in pkg.code.lower()
            ]
        
        active_packages.sort(key=lambda x: x.created_at, reverse=True)
        
        print(f"[DEBUG] Listing active packages: {len(active_packages)}")
        
        serializer = self.get_serializer(active_packages, many=True)
        return Response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # FORCE is_active to be True regardless of serializer defaults
        validated_data = serializer.validated_data
        validated_data['is_active'] = True
            
        package = Package(**validated_data)
        package.save()
        
        print(f"[DEBUG] SUCCESS! Created active package: {package.name}, ID: {package._id}, is_active: {package.is_active}")
        
        output_serializer = self.get_serializer(package)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        
        # Manually update fields to avoid Djongo's problematic update logic
        for attr, value in serializer.validated_data.items():
            setattr(instance, attr, value)
        
        # Only save modified fields to be safe
        instance.save(update_fields=list(serializer.validated_data.keys()) + ['updated_at'])
        
        return Response(serializer.data)

    def perform_destroy(self, instance):
        # Safe soft delete
        instance.is_active = False
        instance.save(update_fields=['is_active', 'updated_at'])
