import requests

from .models import NotificationLog, PushDevice

EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
CANAL_CHAMADOS = 'default'
CANAL_URGENTES = 'urgent-v2'
SOM_URGENTE = 'urgent.wav'


def registrar_log_envio(chamado, dispositivo, titulo, corpo, urgente):
    return NotificationLog.objects.create(
        usuario=dispositivo.usuario,
        device=dispositivo,
        chamado=chamado,
        evento='enviado',
        titulo=titulo,
        corpo=corpo,
        urgente=urgente,
        plataforma=dispositivo.plataforma,
        modelo=dispositivo.modelo,
        fabricante=dispositivo.fabricante,
        sistema=dispositivo.sistema,
    )


def montar_payload_push(chamado, dispositivo, titulo, corpo):
    urgente = chamado.urgente and chamado.status != 'resolvido'
    log = registrar_log_envio(chamado, dispositivo, titulo, corpo, urgente)

    return {
        'to': dispositivo.token,
        'sound': SOM_URGENTE if urgente else 'default',
        'title': titulo,
        'body': corpo,
        'priority': 'high' if urgente else 'default',
        'channelId': CANAL_URGENTES if urgente else CANAL_CHAMADOS,
        'ttl': 3600 if urgente else 86400,
        'data': {
            'chamadoId': chamado.id,
            'notificationLogId': log.id,
            'status': chamado.status,
            'urgente': urgente,
        },
    }


def enviar_push_novo_chamado(chamado):
    dispositivos = list(
        PushDevice.objects.select_related('usuario').filter(
            ativo=True,
            usuario__is_active=True,
        )
    )

    if not dispositivos:
        return

    titulo = 'URGENTE - Novo chamado Delta' if chamado.urgente else 'Novo chamado Delta'
    corpo = f'{chamado.condominio.nome}: {chamado.titulo}'
    mensagens = [
        montar_payload_push(chamado, dispositivo, titulo, corpo)
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


def enviar_push_chamado_atualizado(chamado, titulo, corpo):
    dispositivos = list(
        PushDevice.objects.select_related('usuario').filter(
            ativo=True,
            usuario__is_active=True,
        )
    )

    if not dispositivos:
        return

    mensagens = [
        montar_payload_push(chamado, dispositivo, titulo, corpo)
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
