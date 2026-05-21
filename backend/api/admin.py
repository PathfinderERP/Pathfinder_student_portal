from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, UploadedFile

class CustomUserAdmin(UserAdmin):
    # Add your custom fields here if you want them visible in admin
    fieldsets = UserAdmin.fieldsets + (
        ('Custom Fields', {'fields': ('user_type', 'permissions')}),
        ('Academic Info', {'fields': ('session', 'class_level', 'target_exam', 'exam_section', 'study_section')}),
        ('ERP Integration', {'fields': ('erp_student_id', 'employee_id', 'admission_number')}),
        ('Centre Info', {'fields': ('centre_code', 'centre_name')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Custom Fields', {'fields': ('user_type', 'permissions')}),
    )
    
    # OPTIMIZATION: List display - only essential fields to reduce rendering
    list_display = ('username', 'email', 'user_type', 'session', 'class_level', 'is_staff', 'is_active')
    
    # OPTIMIZATION: Eager load related objects to avoid N+1 queries
    list_select_related = ('session', 'class_level', 'target_exam')
    
    # OPTIMIZATION: Use raw ID fields for foreign keys to avoid loading all related objects for dropdown
    raw_id_fields = ('session', 'class_level', 'target_exam')
    
    # OPTIMIZATION: Pagination - limit records per page
    list_per_page = 50
    
    # OPTIMIZATION: Filter options
    list_filter = ('user_type', 'is_staff', 'is_superuser', 'is_active', 'session', 'class_level')
    
    # OPTIMIZATION: Add search for faster lookups
    search_fields = ('username', 'email', 'erp_student_id', 'admission_number')
    
    # OPTIMIZATION: Date hierarchy for quick filtering
    date_hierarchy = 'date_joined'

admin.site.register(CustomUser, CustomUserAdmin)
admin.site.register(UploadedFile)
