from django.contrib.auth.models import User
from rest_framework import serializers

from .auth_utils import perfil_usuario
from .models import (
    AccessLog,
    ActionLog,
    Chamado,
    Condominio,
    NotificationLog,
    PushDevice,
)


class CondominioSerializer(serializers.ModelSerializer):

    class Meta:
        model = Condominio
        fields = "__all__"


class ChamadoSerializer(serializers.ModelSerializer):

    condominio_nome = serializers.CharField(
        source="condominio.nome",
        read_only=True
    )
    criado_por_nome = serializers.SerializerMethodField()
    assumido_por_nome = serializers.SerializerMethodField()
    editado_por_nome = serializers.SerializerMethodField()

    class Meta:
        model = Chamado
        fields = "__all__"
        read_only_fields = [
            "criado_por",
            "assumido_por",
            "editado_por",
        ]

    def get_criado_por_nome(self, obj):
        if not obj.criado_por:
            return ""

        return obj.criado_por.get_full_name() or obj.criado_por.username

    def get_assumido_por_nome(self, obj):
        if not obj.assumido_por:
            return ""

        return obj.assumido_por.get_full_name() or obj.assumido_por.username

    def get_editado_por_nome(self, obj):
        if not obj.editado_por:
            return ""

        return obj.editado_por.get_full_name() or obj.editado_por.username

    def validate(self, attrs):
        status = attrs.get(
            'status',
            self.instance.status if self.instance else None
        )
        descricao_resolucao = attrs.get(
            'descricao_resolucao',
            self.instance.descricao_resolucao if self.instance else ''
        )

        if status == 'resolvido' and not descricao_resolucao.strip():
            raise serializers.ValidationError({
                'descricao_resolucao': (
                    'Informe uma breve descricao do que foi feito.'
                )
            })

        return attrs


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


class NotificationLogSerializer(serializers.ModelSerializer):

    usuario_nome = serializers.CharField(
        source='usuario.username',
        read_only=True
    )
    chamado_titulo = serializers.CharField(
        source='chamado.titulo',
        read_only=True
    )
    condominio_nome = serializers.CharField(
        source='chamado.condominio.nome',
        read_only=True
    )

    class Meta:
        model = NotificationLog
        fields = [
            'id',
            'usuario',
            'usuario_nome',
            'device',
            'chamado',
            'chamado_titulo',
            'condominio_nome',
            'evento',
            'titulo',
            'corpo',
            'urgente',
            'plataforma',
            'modelo',
            'fabricante',
            'sistema',
            'detalhe',
            'criado_em',
        ]
        read_only_fields = [
            'id',
            'usuario',
            'usuario_nome',
            'device',
            'chamado_titulo',
            'condominio_nome',
            'titulo',
            'corpo',
            'urgente',
            'plataforma',
            'modelo',
            'fabricante',
            'sistema',
            'detalhe',
            'criado_em',
        ]


class PushDeviceSerializer(serializers.ModelSerializer):

    class Meta:
        model = PushDevice
        extra_kwargs = {
            'token': {
                'validators': [],
            },
        }
        fields = [
            'id',
            'token',
            'plataforma',
            'modelo',
            'fabricante',
            'sistema',
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
