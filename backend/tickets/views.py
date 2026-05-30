import os

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.models import Group, User
from django.core.cache import cache
from django.utils import timezone
import requests
from rest_framework import status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .auth_utils import MONITORAMENTO, PERFIS, get_client_ip, perfil_usuario
from .models import (
    AccessLog,
    ActionLog,
    Chamado,
    Condominio,
    NotificationLog,
    PushDevice,
)
from .permissions import (
    AdminOnlyPermission,
    PerfilChamadoPermission,
    PerfilCondominioPermission,
)
from .push import enviar_push_chamado_atualizado, enviar_push_novo_chamado
from .serializers import (
    AccessLogSerializer,
    ActionLogSerializer,
    ChamadoSerializer,
    CondominioSerializer,
    NotificationLogSerializer,
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


def snapshot_chamado(chamado):
    return {
        'Titulo': chamado.titulo,
        'Descricao': chamado.descricao,
        'Condominio': chamado.condominio.nome if chamado.condominio else '',
        'Urgente': 'sim' if chamado.urgente else 'nao',
        'Status': chamado.status,
        'Foto': 'sim' if chamado.imagem else 'nao',
        'Foto resolucao': 'sim' if chamado.imagem_resolucao else 'nao',
        'Feito': chamado.descricao_resolucao or '',
    }


def montar_detalhe_edicao_chamado(chamado, antes, depois):
    campos_alterados = [
        campo
        for campo, valor_anterior in antes.items()
        if str(valor_anterior) != str(depois.get(campo, ''))
    ]

    if not campos_alterados:
        return f'Chamado #{chamado.id}: sem alteracoes relevantes.'

    linhas = [
        f'Chamado #{chamado.id}: {chamado.titulo}',
        'Original:',
    ]

    for campo in campos_alterados:
        linhas.append(f'- {campo}: {antes.get(campo) or "-"}')

    linhas.append('Editado:')

    for campo in campos_alterados:
        linhas.append(f'- {campo}: {depois.get(campo) or "-"}')

    return '\n'.join(linhas)


def chave_rate_limit_login(request, username):
    ip = get_client_ip(request) or 'sem-ip'
    usuario = (username or 'sem-usuario').strip().lower()
    return f'login-rate:{ip}:{usuario}'


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
        chave_rate_limit = chave_rate_limit_login(request, username)
        tentativas = cache.get(chave_rate_limit, 0)

        if tentativas >= settings.LOGIN_RATE_LIMIT_ATTEMPTS:
            return Response(
                {
                    'detail': (
                        'Muitas tentativas de login. Aguarde alguns minutos '
                        'e tente novamente.'
                    )
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

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
            cache.set(
                chave_rate_limit,
                tentativas + 1,
                settings.LOGIN_RATE_LIMIT_WINDOW,
            )
            return Response(
                {'detail': 'Usuário ou senha inválidos.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.is_active:
            return Response(
                {'detail': 'Usuário inativo.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        cache.delete(chave_rate_limit)
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


class MinhaSenhaView(APIView):

    def post(self, request):
        senha_atual = request.data.get('senha_atual', '')
        nova_senha = request.data.get('nova_senha', '')

        if not senha_atual or not nova_senha:
            return Response(
                {'detail': 'Informe a senha atual e a nova senha.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(nova_senha) < 6:
            return Response(
                {'detail': 'A nova senha precisa ter pelo menos 6 caracteres.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not request.user.check_password(senha_atual):
            return Response(
                {'detail': 'Senha atual incorreta.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        request.user.set_password(nova_senha)
        request.user.save()

        registrar_acao(
            request,
            'alterou_propria_senha',
            f'Usuário #{request.user.id}: {request.user.username}',
        )

        return Response({'detail': 'Senha alterada.'})


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

    @action(detail=True, methods=['post'], url_path='marcar-recebido')
    def marcar_recebido(self, request, pk=None):
        chamado = self.get_object()

        if not chamado.recebido_em:
            chamado.recebido_em = timezone.now()
            chamado.save(update_fields=['recebido_em', 'atualizado_em'])

        return Response(self.get_serializer(chamado).data)

    @action(detail=True, methods=['post'], url_path='marcar-visualizado')
    def marcar_visualizado(self, request, pk=None):
        chamado = self.get_object()

        if not chamado.visualizado_em:
            chamado.visualizado_em = timezone.now()

            if not chamado.recebido_em:
                chamado.recebido_em = chamado.visualizado_em
                chamado.save(
                    update_fields=[
                        'recebido_em',
                        'visualizado_em',
                        'atualizado_em',
                    ]
                )
            else:
                chamado.save(update_fields=['visualizado_em', 'atualizado_em'])

        return Response(self.get_serializer(chamado).data)

    def perform_update(self, serializer):
        novo_status = self.request.data.get('status')
        status_anterior = serializer.instance.status
        chamado_antes = Chamado.objects.select_related(
            'condominio',
        ).get(pk=serializer.instance.pk)
        dados_antes = snapshot_chamado(chamado_antes)

        if (
            perfil_usuario(self.request.user) == MONITORAMENTO
            and novo_status == 'andamento'
        ):
            raise PermissionDenied(
                'Monitoramento nao pode iniciar atendimento.'
            )

        if (
            perfil_usuario(self.request.user) == MONITORAMENTO
            and status_anterior != 'aberto'
        ):
            raise PermissionDenied(
                'Monitoramento so pode editar chamados abertos.'
            )

        campos_extras = {}
        campos_extras['editado_por'] = self.request.user

        if novo_status == 'andamento' and status_anterior != 'andamento':
            campos_extras['assumido_por'] = self.request.user

        if novo_status == 'aberto':
            campos_extras['assumido_por'] = None

        chamado = serializer.save(**campos_extras)
        chamado_atualizado = Chamado.objects.select_related(
            'condominio',
        ).get(pk=chamado.pk)
        dados_depois = snapshot_chamado(chamado_atualizado)
        registrar_acao(
            self.request,
            'editou_chamado',
            montar_detalhe_edicao_chamado(
                chamado_atualizado,
                dados_antes,
                dados_depois,
            ),
        )

        if novo_status == 'andamento' and status_anterior != 'andamento':
            usuario = self.request.user.get_full_name() or self.request.user.username
            enviar_push_chamado_atualizado(
                chamado,
                'Chamado assumido',
                f'{usuario} assumiu: {chamado.titulo}',
            )

        if novo_status == 'resolvido' and status_anterior != 'resolvido':
            usuario = self.request.user.get_full_name() or self.request.user.username
            enviar_push_chamado_atualizado(
                chamado,
                'Chamado resolvido',
                f'{usuario} resolveu: {chamado.titulo}',
            )


class CondominioViewSet(viewsets.ModelViewSet):

    queryset = Condominio.objects.all().order_by('nome')
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
        modelo = serializer.validated_data.get('modelo', '')
        fabricante = serializer.validated_data.get('fabricante', '')
        sistema = serializer.validated_data.get('sistema', '')

        device, _ = PushDevice.objects.update_or_create(
            token=token,
            defaults={
                'usuario': self.request.user,
                'plataforma': plataforma,
                'modelo': modelo,
                'fabricante': fabricante,
                'sistema': sistema,
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


class NotificationLogViewSet(viewsets.ModelViewSet):

    serializer_class = NotificationLogSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        queryset = NotificationLog.objects.select_related(
            'usuario',
            'device',
            'chamado',
            'chamado__condominio',
        ).order_by('-criado_em')

        if perfil_usuario(self.request.user) == 'admin':
            return queryset

        return queryset.filter(usuario=self.request.user)

    def list(self, request, *args, **kwargs):
        if perfil_usuario(request.user) != 'admin':
            raise PermissionDenied('Apenas administradores podem ver logs.')

        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        evento = request.data.get('evento')

        if evento not in ['recebido', 'aberto']:
            return Response(
                {'detail': 'Evento de notificacao invalido.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        chamado = None
        chamado_id = request.data.get('chamado')

        if chamado_id:
            chamado = Chamado.objects.filter(id=chamado_id).first()

        log_origem = None
        log_origem_id = request.data.get('notificationLogId')

        if log_origem_id:
            log_origem = NotificationLog.objects.filter(
                id=log_origem_id,
                usuario=request.user
            ).first()

        device = None
        token = request.data.get('token')

        if token:
            device = PushDevice.objects.filter(
                token=token,
                usuario=request.user
            ).first()

        if device is None and log_origem:
            device = log_origem.device

        if chamado is None and log_origem:
            chamado = log_origem.chamado

        titulo = log_origem.titulo if log_origem else request.data.get('titulo', '')
        corpo = log_origem.corpo if log_origem else request.data.get('corpo', '')
        urgente = log_origem.urgente if log_origem else bool(request.data.get('urgente'))

        if chamado and not titulo:
            titulo = 'Chamado recebido'

        if chamado and not corpo:
            corpo = f'{chamado.condominio.nome}: {chamado.titulo}'

        if chamado:
            urgente = chamado.urgente

        if evento == 'recebido' and chamado:
            notification_log = NotificationLog.objects.filter(
                usuario=request.user,
                chamado=chamado,
                evento='recebido',
            ).order_by('-criado_em').first()

            if notification_log:
                return Response(
                    self.get_serializer(notification_log).data,
                    status=status.HTTP_200_OK
                )

        notification_log = NotificationLog.objects.create(
            usuario=request.user,
            device=device,
            chamado=chamado,
            evento=evento,
            titulo=titulo,
            corpo=corpo,
            urgente=urgente,
            plataforma=device.plataforma if device else '',
            modelo=device.modelo if device else '',
            fabricante=device.fabricante if device else '',
            sistema=device.sistema if device else '',
            detalhe=f'log_origem={log_origem.id}' if log_origem else '',
        )

        return Response(
            self.get_serializer(notification_log).data,
            status=status.HTTP_201_CREATED
        )
