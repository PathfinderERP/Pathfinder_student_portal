from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    system_status, FileViewSet, CustomTokenObtainPairView, ProfileView, 
    UserViewSet, RegisterView, LoginHistoryView, GrievanceViewSet, DoubtViewSet,
    StudyTaskViewSet, NoticeViewSet, UserSearchView, 
    StudentPsychometricProfileView, StudentStudyPlannerConfigView, AdminStudentPsychometricProfileView, AdminAllPsychometricProfilesView,
    UserActivityLogViewSet, get_student_activity_analytics, get_student_curriculum_progress,
    get_swot_analysis
)
from .erp_views import (
    get_student_erp_data, get_all_students_erp_data, get_student_attendance, 
    get_student_classes, get_ongoing_classes, get_upcoming_classes, get_previous_classes,
    get_student_portal_profile, get_student_portal_report,
    get_all_centres_erp_data, get_all_teachers_erp_data, get_exam_tag,
    sync_teachers_from_erp
)
from .scholarlab_views import get_scholarlab_simulations, initialize_scholarlab_simulation
from .gemini_views import generate_ai_study_plan, get_college_intelligence, search_college_ai, extract_marksheet_data, get_student_ai_insights, student_ai_insights_chat

router = DefaultRouter()
router.register(r'files', FileViewSet)
router.register(r'users', UserViewSet)
router.register(r'grievances', GrievanceViewSet)
router.register(r'doubts', DoubtViewSet)
router.register(r'study-tasks', StudyTaskViewSet, basename='study-task')
router.register(r'notices', NoticeViewSet)
router.register(r'activity-logs', UserActivityLogViewSet, basename='activity-log')

urlpatterns = [
    path('system-status/', system_status, name='system-status'),
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('register/', RegisterView.as_view(), name='register'),
    path('login-history/', LoginHistoryView.as_view(), name='login-history'),
    path('student/erp-data/', get_student_erp_data, name='student-erp-data'),
    path('student/attendance/', get_student_attendance, name='student-attendance'),
    path('student/classes/', get_student_classes, name='student-classes'),
    path('student-portal/classes/ongoing/', get_ongoing_classes, name='student-portal-ongoing'),
    path('student-portal/classes/upcoming/', get_upcoming_classes, name='student-portal-upcoming'),
    path('student-portal/classes/ongoing/<str:studentId>/', get_ongoing_classes, name='student-portal-ongoing-id'),
    path('student-portal/classes/upcoming/<str:studentId>/', get_upcoming_classes, name='student-portal-upcoming-id'),
    path('student-portal/classes/previous/', get_previous_classes, name='student-portal-previous'),
    path('student-portal/classes/previous/<str:studentId>/', get_previous_classes, name='student-portal-previous-id'),
    path('student-portal/profile/', get_student_portal_profile, name='student-portal-profile'),
    path('student-portal/profile/<str:studentId>/', get_student_portal_profile, name='student-portal-profile-id'),
    path('student-portal/report/', get_student_portal_report, name='student-portal-report'),
    path('student-portal/report/<str:studentId>/', get_student_portal_report, name='student-portal-report-id'),
    # No-slash fallbacks
    path('student-portal/classes/ongoing', get_ongoing_classes),
    path('student-portal/classes/upcoming', get_upcoming_classes),
    path('student-portal/classes/previous', get_previous_classes),
    path('student-portal/profile', get_student_portal_profile),
    path('student-portal/report', get_student_portal_report),
    path('student-portal/classes/ongoing/<str:studentId>', get_ongoing_classes),
    path('student-portal/classes/upcoming/<str:studentId>', get_upcoming_classes),
    path('student-portal/classes/previous/<str:studentId>', get_previous_classes),
    path('student-portal/profile/<str:studentId>', get_student_portal_profile),
    path('student-portal/report/<str:studentId>', get_student_portal_report),
    path('admin/erp-students/', get_all_students_erp_data, name='admin-erp-students'),
    path('admin/student-psychometric-profile/<str:email>/', AdminStudentPsychometricProfileView.as_view(), name='admin-student-psychometric-profile'),
    path('admin/all-psychometric-profiles/', AdminAllPsychometricProfilesView.as_view(), name='admin-all-psychometric-profiles'),
    path('admin/erp-centres/', get_all_centres_erp_data, name='admin-erp-centres'),
    path('admin/erp-teachers/', get_all_teachers_erp_data, name='admin-erp-teachers'),
    path('admin/sync-teachers/', sync_teachers_from_erp, name='admin-sync-teachers'),
    path('student/scholarlab/simulations/', get_scholarlab_simulations, name='scholarlab-simulations'),
    path('student/scholarlab/initialize/', initialize_scholarlab_simulation, name='scholarlab-initialize'),
    path('student/ai-mentor/study-plan/', generate_ai_study_plan, name='ai-mentor-study-plan'),
    path('student/ai-mentor/college-intelligence/', get_college_intelligence, name='ai-college-intelligence'),
    path('student/ai-mentor/college-search/', search_college_ai, name='ai-college-search'),
    path('student/ai-mentor/extract-marksheet/', extract_marksheet_data, name='ai-mentor-extract-marksheet'),
    path('student/ai-mentor/insights/', get_student_ai_insights, name='ai-mentor-insights'),
    path('student/ai-mentor/chat/', student_ai_insights_chat, name='ai-mentor-chat'),
    path('chat/search/', UserSearchView.as_view(), name='chat-search'),
    path('student/psychometric-profile/', StudentPsychometricProfileView.as_view(), name='psychometric-profile'),
    path('student/study-planner-config/', StudentStudyPlannerConfigView.as_view(), name='study-planner-config'),
    path('student/activity-analytics/', get_student_activity_analytics, name='activity-analytics'),
    path('student/curriculum-progress/', get_student_curriculum_progress, name='curriculum-progress'),
    path('student/swot-analysis/', get_swot_analysis, name='swot-analysis'),
    path('examTag/<str:tagId>/', get_exam_tag, name='exam-tag'),
    path('admin/temp-cleanup/', include([
        path('grievances/', 
             __import__('api.views', fromlist=['temporary_cleanup_view']).temporary_cleanup_view),
        path('duplicate-users/', 
             __import__('api.views', fromlist=['cleanup_duplicate_users_view']).cleanup_duplicate_users_view),
    ])),
    path('', include(router.urls)),
]
