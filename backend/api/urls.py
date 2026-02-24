from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import FileViewSet, CustomTokenObtainPairView, ProfileView, UserViewSet, RegisterView, LoginHistoryView, GrievanceViewSet, StudyTaskViewSet, NoticeViewSet, UserSearchView
from .erp_views import get_student_erp_data, get_all_students_erp_data, get_student_attendance, get_student_classes, get_all_centres_erp_data
from .scholarlab_views import get_scholarlab_simulations, initialize_scholarlab_simulation

router = DefaultRouter()
router.register(r'files', FileViewSet)
router.register(r'users', UserViewSet)
router.register(r'grievances', GrievanceViewSet)
router.register(r'study-tasks', StudyTaskViewSet, basename='study-task')
router.register(r'notices', NoticeViewSet)

urlpatterns = [
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('register/', RegisterView.as_view(), name='register'),
    path('login-history/', LoginHistoryView.as_view(), name='login-history'),
    path('student/erp-data/', get_student_erp_data, name='student-erp-data'),
    path('student/attendance/', get_student_attendance, name='student-attendance'),
    path('student/classes/', get_student_classes, name='student-classes'),
    path('admin/erp-students/', get_all_students_erp_data, name='admin-erp-students'),
    path('admin/erp-centres/', get_all_centres_erp_data, name='admin-erp-centres'),
    path('student/scholarlab/simulations/', get_scholarlab_simulations, name='scholarlab-simulations'),
    path('student/scholarlab/initialize/', initialize_scholarlab_simulation, name='scholarlab-initialize'),
    path('chat/search/', UserSearchView.as_view(), name='chat-search'),
    path('admin/temp-cleanup/', include([
        path('grievances/', 
             __import__('api.views', fromlist=['temporary_cleanup_view']).temporary_cleanup_view),
        path('duplicate-users/', 
             __import__('api.views', fromlist=['cleanup_duplicate_users_view']).cleanup_duplicate_users_view),
    ])),
    path('', include(router.urls)),
]
