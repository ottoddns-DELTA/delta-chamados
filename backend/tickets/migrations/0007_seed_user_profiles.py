from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.db import migrations


USUARIOS = [
    ('admin', 'admin123', 'admin'),
    ('monitoramento', 'monitor123', 'monitoramento'),
    ('tecnico', 'tecnico123', 'tecnico'),
]


def criar_usuarios(apps, schema_editor):
    user_app_label, user_model_name = settings.AUTH_USER_MODEL.split('.')
    group = apps.get_model('auth', 'Group')
    user = apps.get_model(user_app_label, user_model_name)

    for username, password, perfil in USUARIOS:
        perfil_group, _ = group.objects.get_or_create(name=perfil)
        usuario, criado = user.objects.get_or_create(
            username=username,
            defaults={
                'is_staff': perfil == 'admin',
                'is_superuser': perfil == 'admin',
                'is_active': True,
            },
        )

        if criado:
            usuario.password = make_password(password)
            usuario.save()

        usuario.groups.add(perfil_group)


def remover_usuarios(apps, schema_editor):
    user_app_label, user_model_name = settings.AUTH_USER_MODEL.split('.')
    user = apps.get_model(user_app_label, user_model_name)
    user.objects.filter(
        username__in=[username for username, _password, _perfil in USUARIOS]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('auth', '0012_alter_user_first_name_max_length'),
        ('tickets', '0006_accesslog_actionlog'),
    ]

    operations = [
        migrations.RunPython(criar_usuarios, remover_usuarios),
    ]
