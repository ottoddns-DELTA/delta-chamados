from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    ChamadoViewSet,
    CondominioViewSet,
)

router = DefaultRouter()

router.register(r'chamados', ChamadoViewSet)
router.register(r'condominios', CondominioViewSet)

urlpatterns = [
    path('', include(router.urls)),
]