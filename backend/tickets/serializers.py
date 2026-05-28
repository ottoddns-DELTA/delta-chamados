from django.contrib.auth.models import User
from rest_framework import serializers

from .auth_utils import perfil_usuario
from .models import AccessLog, ActionLog, Chamado, Condominio, PushDevice


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


class UserSerializer(serializers.ModelSerializer):

    perfil = serializers.SerializerMethodField()
    password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True
    )

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'first_name',
            'last_name',
            'email',
            'is_active',
            'perfil',
            'password',
        ]

    def get_perfil(self, obj):
        return perfil_usuario(obj)

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User(**validated_data)

        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()

        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)

        for campo, valor in validated_data.items():
            setattr(instance, campo, valor)

        if password:
            instance.set_password(password)

        instance.save()
        return instance


class AccessLogSerializer(serializers.ModelSerializer):

    user_nome = serializers.CharField(
        source='user.username',
        read_only=True
    )

    class Meta:
        model = AccessLog
        fields = "__all__"


class ActionLogSerializer(serializers.ModelSerializer):

    usuario_nome = serializers.CharField(
        source='usuario.username',
        read_only=True
    )

    class Meta:
        model = ActionLog
        fields = "__all__"


class PushDeviceSerializer(serializers.ModelSerializer):

    class Meta:
        model = PushDevice
        fields = [
            'id',
            'token',
            'plataforma',
            'ativo',
            'criado_em',
            'atualizado_em',
        ]
        read_only_fields = [
            'id',
            'ativo',
            'criado_em',
            'atualizado_em',
        ]
