from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import FileViewSet, CustomTokenObtainPairView, ProfileView, UserViewSet, RegisterView, LoginHistoryView, GrievanceViewSet, StudyTaskViewSet, NoticeViewSet
from .erp_views import get_student_erp_data, get_all_students_erp_data

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
    path('admin/erp-students/', get_all_students_erp_data, name='admin-erp-students'),
    path('', include(router.urls)),
]
