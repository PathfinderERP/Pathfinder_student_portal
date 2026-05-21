from django.contrib import admin
from .models import Package

class PackageAdmin(admin.ModelAdmin):
    # OPTIMIZATION: List display - only essential fields
    list_display = ('name', 'code', 'exam_type', 'session', 'is_active', 'is_published')
    
    # OPTIMIZATION: Eager load related objects to avoid N+1 queries
    list_select_related = ('exam_type', 'session')
    
    # OPTIMIZATION: Use raw ID fields for foreign keys
    raw_id_fields = ('exam_type', 'session')
    
    # OPTIMIZATION: Pagination limit
    list_per_page = 50
    
    # OPTIMIZATION: Filter options
    list_filter = ('is_active', 'is_published', 'content_status', 'test_status', 'session', 'exam_type')
    
    # OPTIMIZATION: Search for faster lookups
    search_fields = ('name', 'code')
    
    # OPTIMIZATION: Date hierarchy for quick filtering
    date_hierarchy = 'created_at'
    
    # Fieldsets for better form organization
    fieldsets = (
        ('Basic Info', {'fields': ('name', 'code', 'description')}),
        ('Relationships', {'fields': ('exam_type', 'session')}),
        ('Media', {'fields': ('image',)}),
        ('Status', {'fields': ('content_status', 'test_status', 'is_completed', 'is_published', 'is_active')}),
        ('Timeline', {'fields': ('start_year', 'end_year')}),
    )

admin.site.register(Package, PackageAdmin)
