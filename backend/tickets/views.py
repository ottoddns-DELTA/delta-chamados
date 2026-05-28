from rest_framework import viewsets

from .models import Chamado, Condominio

from .serializers import (
    ChamadoSerializer,
    CondominioSerializer,
)


class ChamadoViewSet(viewsets.ModelViewSet):

    queryset = Chamado.objects.all().order_by('-criado_em')

    serializer_class = ChamadoSerializer


class CondominioViewSet(viewsets.ModelViewSet):

    queryset = Condominio.objects.all().order_by('-id')

    serializer_class = CondominioSerializer