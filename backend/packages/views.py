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
        user = self.request.user
        queryset = Package.objects.filter(is_active=True)
        
        if not user.is_staff and not user.is_superuser and getattr(user, 'user_type', None) == 'student':
            queryset = queryset.filter(is_published=True)
            exam_section = getattr(user, 'exam_section', None)
            if exam_section:
                queryset = queryset.filter(
                    Q(allotted_sections__name=exam_section) | Q(allotted_sections__isnull=True)
                ).distinct()
        return queryset

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
        queryset = self.get_queryset()
        active_packages = list(queryset)
        
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
        
        validated_data = serializer.validated_data
        # Ensure is_active is True for soft-delete purposes on creation
        validated_data['is_active'] = True
        # Ensure is_published is False by default if not provided
        if 'is_published' not in validated_data:
            validated_data['is_published'] = False
        
        # Separate Many-to-Many data from regular data
        m2m_data = {}
        create_data = {}
        for attr, value in validated_data.items():
            try:
                field = Package._meta.get_field(attr)
                if field.many_to_many:
                    m2m_data[attr] = value
                else:
                    create_data[attr] = value
            except:
                # If field not found on model, it might be a serializer-only field
                create_data[attr] = value
            
        # Create the instance without m2m fields
        package = Package.objects.create(**create_data)
        
        # Set m2m fields after the instance is saved (required by Django)
        for attr, value in m2m_data.items():
            if value:
                getattr(package, attr).set(value)
        
        print(f"[DEBUG] SUCCESS! Created active package: {package.name}, ID: {package._id}, is_active: {package.is_active}")
        
        output_serializer = self.get_serializer(package)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        
        # Manually update fields to avoid Djongo's problematic update logic
        non_m2m_fields = []
        for attr, value in serializer.validated_data.items():
            try:
                field = instance._meta.get_field(attr)
                if field.many_to_many:
                    getattr(instance, attr).set(value)
                else:
                    setattr(instance, attr, value)
                    non_m2m_fields.append(attr)
            except:
                setattr(instance, attr, value)
                non_m2m_fields.append(attr)
        
        # Save non-m2m fields
        if non_m2m_fields:
            instance.save(update_fields=non_m2m_fields + ['updated_at'])
        else:
            instance.save() # Just update updated_at if only m2m changed
        
        return Response(serializer.data)

    def perform_destroy(self, instance):
        # Safe soft delete
        instance.is_active = False
        instance.save(update_fields=['is_active', 'updated_at'])
