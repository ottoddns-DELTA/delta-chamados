from rest_framework import serializers

from .models import Chamado, Condominio


class CondominioSerializer(serializers.ModelSerializer):

    class Meta:
        model = Condominio
        fields = "__all__"


class ChamadoSerializer(serializers.ModelSerializer):

    condominio_nome = serializers.CharField(
        source="condominio.nome",
        read_only=True
    )

    class Meta:
        model = Chamado
        fields = "__all__"