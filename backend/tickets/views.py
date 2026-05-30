import os

from django.contrib.auth import authenticate
from django.contrib.auth.models import Group, User
import requests
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


def melhorar_texto_local(texto):
    texto_limpo = ' '.join(texto.split())

    if not texto_limpo:
        return ''

    substituicoes = [
        ('foi trocado a ', 'Foi realizada a troca da '),
        ('foi trocada a ', 'Foi realizada a troca da '),
        ('foi trocado o ', 'Foi realizada a troca do '),
        ('fizemos ', 'realizamos '),
        ('arrumamos ', 'realizamos o reparo em '),
        ('consertamos ', 'realizamos o reparo em '),
    ]

    texto_melhorado = texto_limpo
    texto_minusculo = texto_melhorado.lower()

    for origem, destino in substituicoes:
        if origem in texto_minusculo:
            indice = texto_minusculo.index(origem)
            texto_melhorado = (
                texto_melhorado[:indice]
                + destino
                + texto_melhorado[indice + len(origem):]
            )
            texto_minusculo = texto_melhorado.lower()

    texto_melhorado = (
        texto_melhorado[:1].upper()
        + texto_melhorado[1:]
    )

    if texto_melhorado[-1] not in '.!?':
        texto_melhorado += '.'

    return texto_melhorado


class MelhorarTextoView(APIView):

    def post(self, request):
        texto = request.data.get('texto', '').strip()
        contexto = request.data.get('contexto', 'chamado')

        if not texto:
            return Response(
                {'detail': 'Informe o texto para melhorar.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        api_key = os.environ.get('GEMINI_API_KEY')

        if not api_key:
            return Response(
                {
                    'detail': (
                        'Gemini nao configurado. Defina GEMINI_API_KEY '
                        'nas variaveis do backend.'
                    ),
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        modelo = os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash-lite')
        prompt = (
            'Voce revisa textos curtos para um sistema de chamados de '
            'condominios. Reescreva em portugues do Brasil, com tom tecnico, '
            'claro e objetivo. Corrija ortografia e concordancia. Nao invente '
            'informacoes, nao adicione valores, datas, nomes ou detalhes que '
            'nao estejam no texto original. Responda somente com o texto '
            'revisado, sem aspas e sem explicacoes. '
            f'Contexto: {contexto}. Texto: {texto}'
        )

        try:
            resposta = requests.post(
                (
                    'https://generativelanguage.googleapis.com/v1beta/models/'
                    f'{modelo}:generateContent'
                ),
                params={'key': api_key},
                json={
                    'contents': [
                        {
                            'parts': [
                                {'text': prompt}
                            ]
                        },
                    ],
                    'generationConfig': {
                        'temperature': 0.2,
                        'maxOutputTokens': 160,
                    },
                },
                timeout=12,
            )
            resposta.raise_for_status()
            data = resposta.json()
            texto_melhorado = (
                data.get('candidates', [{}])[0]
                .get('content', {})
                .get('parts', [{}])[0]
                .get('text', '')
                .strip()
            )

            if not texto_melhorado:
                raise ValueError('Resposta vazia do Gemini.')

            registrar_acao(
                request,
                'melhorou_texto',
                f'Contexto: {contexto}',
            )

            return Response({
                'texto': texto_melhorado,
                'origem': 'gemini',
            })
        except requests.RequestException as erro:
            status_code = getattr(erro.response, 'status_code', None)
            detalhe = ''

            if erro.response is not None:
                detalhe = erro.response.text[:240]

            return Response(
                {
                    'detail': (
                        'Gemini falhou. Verifique chave, quota e modelo.'
                    ),
                    'status_code': status_code,
                    'erro': detalhe,
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception as erro:
            return Response(
                {
                    'detail': 'Gemini retornou uma resposta invalida.',
                    'erro': str(erro),
                },
                status=status.HTTP_502_BAD_GATEWAY,
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
        chamado = serializer.save(criado_por=self.request.user)
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

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data.get('token')
        plataforma = serializer.validated_data.get('plataforma', '')

        device, _ = PushDevice.objects.update_or_create(
            token=token,
            defaults={
                'usuario': self.request.user,
                'plataforma': plataforma,
                'ativo': True,
            },
        )

        return Response(
            self.get_serializer(device).data,
            status=status.HTTP_201_CREATED
        )

    def perform_destroy(self, instance):
        instance.ativo = False
        instance.save(update_fields=['ativo', 'atualizado_em'])
