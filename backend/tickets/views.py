from django.contrib.auth import authenticate
from django.contrib.auth.models import Group, User
from rest_framework import status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .auth_utils import MONITORAMENTO, PERFIS, get_client_ip, perfil_usuario
from .models import AccessLog, ActionLog, Chamado, Condominio, PushDevice
from .permissions import (
    AdminOnlyPermission,
    PerfilChamadoPermission,
    PerfilCondominioPermission,
)
from .push import enviar_push_novo_chamado
from .serializers import (
    AccessLogSerializer,
    ActionLogSerializer,
    ChamadoSerializer,
    CondominioSerializer,
    PushDeviceSerializer,
    UserSerializer,
)


def registrar_acao(request, acao, detalhe=''):
    ActionLog.objects.create(
        usuario=request.user if request.user.is_authenticated else None,
        perfil=perfil_usuario(request.user),
        acao=acao,
        detalhe=detalhe,
        ip=get_client_ip(request),
    )


class LoginView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username', '')
        password = request.data.get('password', '')
        user = authenticate(
            request,
            username=username,
            password=password,
        )
        ip = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')

        AccessLog.objects.create(
            username=username,
            user=user,
            perfil=perfil_usuario(user),
            ip=ip,
            user_agent=user_agent,
            sucesso=bool(user),
        )

        if not user:
            return Response(
                {'detail': 'Usuário ou senha inválidos.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.is_active:
            return Response(
                {'detail': 'Usuário inativo.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        token, _ = Token.objects.get_or_create(user=user)

        return Response({
            'token': token.key,
            'user': {
                'id': user.id,
                'username': user.username,
                'perfil': perfil_usuario(user),
                'nome': user.get_full_name() or user.username,
            },
        })


class ChamadoViewSet(viewsets.ModelViewSet):

    queryset = Chamado.objects.all().order_by('-criado_em')
    serializer_class = ChamadoSerializer
    permission_classes = [PerfilChamadoPermission]

    def perform_create(self, serializer):
        chamado = serializer.save()
        registrar_acao(
            self.request,
            'criou_chamado',
            f'Chamado #{chamado.id}: {chamado.titulo}',
        )
        enviar_push_novo_chamado(chamado)

    def perform_update(self, serializer):
        novo_status = self.request.data.get('status')

        if (
            perfil_usuario(self.request.user) == MONITORAMENTO
            and novo_status == 'andamento'
        ):
            raise PermissionDenied(
                'Monitoramento nao pode iniciar atendimento.'
            )

        chamado = serializer.save()
        registrar_acao(
            self.request,
            'editou_chamado',
            f'Chamado #{chamado.id}: {chamado.titulo}',
        )


class CondominioViewSet(viewsets.ModelViewSet):

    queryset = Condominio.objects.all().order_by('-id')
    serializer_class = CondominioSerializer
    permission_classes = [PerfilCondominioPermission]

    def perform_create(self, serializer):
        condominio = serializer.save()
        registrar_acao(
            self.request,
            'criou_condominio',
            f'Condomínio #{condominio.id}: {condominio.nome}',
        )

    def perform_update(self, serializer):
        condominio = serializer.save()
        registrar_acao(
            self.request,
            'editou_condominio',
            f'Condomínio #{condominio.id}: {condominio.nome}',
        )

    def perform_destroy(self, instance):
        condominio_id = instance.id
        condominio_nome = instance.nome
        instance.delete()
        registrar_acao(
            self.request,
            'excluiu_condominio',
            f'Condominio #{condominio_id}: {condominio_nome}',
        )


class UserViewSet(viewsets.ModelViewSet):

    queryset = User.objects.all().order_by('username')
    serializer_class = UserSerializer
    permission_classes = [AdminOnlyPermission]

    def perform_create(self, serializer):
        perfil = self.request.data.get('perfil')
        user = serializer.save()
        self._atualizar_perfil(user, perfil)
        registrar_acao(
            self.request,
            'criou_usuario',
            f'Usuário #{user.id}: {user.username}',
        )

    def perform_update(self, serializer):
        perfil = self.request.data.get('perfil')
        user = serializer.save()

        if perfil:
            self._atualizar_perfil(user, perfil)

        registrar_acao(
            self.request,
            'editou_usuario',
            f'Usuário #{user.id}: {user.username}',
        )

    def perform_destroy(self, instance):
        registrar_acao(
            self.request,
            'excluiu_usuario',
            f'Usuário #{instance.id}: {instance.username}',
        )
        instance.delete()

    @action(detail=True, methods=['post'])
    def senha(self, request, pk=None):
        user = self.get_object()
        password = request.data.get('password')

        if not password:
            return Response(
                {'detail': 'Informe a nova senha.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(password)
        user.save()

        registrar_acao(
            request,
            'alterou_senha',
            f'Usuário #{user.id}: {user.username}',
        )

        return Response({'detail': 'Senha alterada.'})

    def _atualizar_perfil(self, user, perfil):
        if perfil not in PERFIS:
            return

        for nome in PERFIS:
            group, _ = Group.objects.get_or_create(name=nome)
            user.groups.remove(group)

        group = Group.objects.get(name=perfil)
        user.groups.add(group)
        user.is_staff = perfil == 'admin'
        user.is_superuser = perfil == 'admin'
        user.save()


class AccessLogViewSet(viewsets.ReadOnlyModelViewSet):

    queryset = AccessLog.objects.all().order_by('-criado_em')
    serializer_class = AccessLogSerializer
    permission_classes = [AdminOnlyPermission]


class ActionLogViewSet(viewsets.ReadOnlyModelViewSet):

    queryset = ActionLog.objects.all().order_by('-criado_em')
    serializer_class = ActionLogSerializer
    permission_classes = [AdminOnlyPermission]


class PushDeviceViewSet(viewsets.ModelViewSet):

    serializer_class = PushDeviceSerializer

    def get_queryset(self):
        return PushDevice.objects.filter(usuario=self.request.user)

    def perform_create(self, serializer):
        token = serializer.validated_data.get('token')
        plataforma = serializer.validated_data.get('plataforma', '')

        PushDevice.objects.update_or_create(
            token=token,
            defaults={
                'usuario': self.request.user,
                'plataforma': plataforma,
                'ativo': True,
            },
        )

    def perform_destroy(self, instance):
        instance.ativo = False
        instance.save(update_fields=['ativo', 'atualizado_em'])
