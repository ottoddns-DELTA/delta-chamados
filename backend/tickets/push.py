import requests

from .auth_utils import TECNICO, perfil_usuario
from .models import PushDevice

EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'


def enviar_push_novo_chamado(chamado):
    dispositivos = [
        dispositivo
        for dispositivo in PushDevice.objects.select_related('usuario').filter(
            ativo=True,
            usuario__is_active=True,
        )
        if perfil_usuario(dispositivo.usuario) == TECNICO
    ]

    if not dispositivos:
        return

    mensagens = [
        {
            'to': dispositivo.token,
            'sound': 'default',
            'title': 'Novo chamado Delta',
            'body': f'{chamado.condominio.nome}: {chamado.titulo}',
            'data': {
                'chamadoId': chamado.id,
                'status': chamado.status,
            },
        }
        for dispositivo in dispositivos
    ]

    try:
        requests.post(
            EXPO_PUSH_URL,
            json=mensagens,
            timeout=10,
        )
    except requests.RequestException:
        pass
