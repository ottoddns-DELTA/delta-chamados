from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    AccessLogViewSet,
    ActionLogViewSet,
    ChamadoViewSet,
    CondominioViewSet,
    LoginView,
    UserViewSet,
)

router = DefaultRouter()

router.register(r'chamados', ChamadoViewSet)
router.register(r'condominios', CondominioViewSet)
router.register(r'usuarios', UserViewSet)
router.register(r'access-logs', AccessLogViewSet)
router.register(r'action-logs', ActionLogViewSet)

urlpatterns = [
    path('login/', LoginView.as_view()),
    path('', include(router.urls)),
]
