ADMIN = 'admin'
MONITORAMENTO = 'monitoramento'
TECNICO = 'tecnico'

PERFIS = [ADMIN, MONITORAMENTO, TECNICO]


def perfil_usuario(user):
    if not user or not user.is_authenticated:
        return ''

    if user.is_superuser:
        return ADMIN

    for perfil in PERFIS:
        if user.groups.filter(name=perfil).exists():
            return perfil

    return ''


def get_client_ip(request):
    forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')

    if forwarded_for:
        return forwarded_for.split(',')[0].strip()

    return request.META.get('REMOTE_ADDR')
