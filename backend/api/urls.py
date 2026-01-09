from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import FileViewSet, CustomTokenObtainPairView, ProfileView, UserViewSet, RegisterView, LoginHistoryView

router = DefaultRouter()
router.register(r'files', FileViewSet)
router.register(r'users', UserViewSet)

urlpatterns = [
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('register/', RegisterView.as_view(), name='register'),
    path('login-history/', LoginHistoryView.as_view(), name='login-history'),
    path('', include(router.urls)),
]
