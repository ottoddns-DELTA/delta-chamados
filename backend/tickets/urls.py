from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    AccessLogViewSet,
    ActionLogViewSet,
    ChamadoViewSet,
    CondominioViewSet,
    LoginView,
    MelhorarTextoView,
    MinhaSenhaView,
    NotificationLogViewSet,
    ParametrosSistemaViewSet,
    PushDeviceViewSet,
    UserViewSet,
)

router = DefaultRouter()

router.register(r'chamados', ChamadoViewSet)
router.register(r'condominios', CondominioViewSet)
router.register(r'usuarios', UserViewSet)
router.register(r'access-logs', AccessLogViewSet)
router.register(r'action-logs', ActionLogViewSet)
router.register(r'push-devices', PushDeviceViewSet, basename='push-devices')
router.register(r'notification-logs', NotificationLogViewSet, basename='notification-logs')
router.register(r'parametros', ParametrosSistemaViewSet, basename='parametros')

urlpatterns = [
    path('login/', LoginView.as_view()),
    path('melhorar-texto/', MelhorarTextoView.as_view()),
    path('minha-senha/', MinhaSenhaView.as_view()),
    path('', include(router.urls)),
]
