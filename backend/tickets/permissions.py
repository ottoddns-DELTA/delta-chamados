from rest_framework.permissions import BasePermission

from .auth_utils import ADMIN, MONITORAMENTO, TECNICO, perfil_usuario


class PerfilChamadoPermission(BasePermission):

    def has_permission(self, request, view):
        perfil = perfil_usuario(request.user)

        if perfil == ADMIN:
            return True

        if perfil == MONITORAMENTO:
            return request.method in ['GET', 'POST', 'PATCH', 'PUT']

        if perfil == TECNICO:
            return request.method in ['GET', 'PATCH', 'PUT']

        return False


class PerfilCondominioPermission(BasePermission):

    def has_permission(self, request, view):
        perfil = perfil_usuario(request.user)

        if request.method == 'GET':
            return perfil in [ADMIN, MONITORAMENTO, TECNICO]

        return perfil in [ADMIN, MONITORAMENTO]


class AdminOnlyPermission(BasePermission):

    def has_permission(self, request, view):
        return perfil_usuario(request.user) == ADMIN
