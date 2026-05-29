from django.conf import settings
from django.db import models
from django.utils import timezone
from PIL import Image, ImageOps


TAMANHO_MAXIMO_IMAGEM = (1600, 1600)


class Condominio(models.Model):

    nome = models.CharField(max_length=200)

    endereco = models.CharField(max_length=300)

    telefone = models.CharField(
        max_length=30,
        blank=True,
        null=True
    )

    def __str__(self):
        return self.nome


class Chamado(models.Model):

    STATUS = [
        ('aberto', 'Aberto'),
        ('andamento', 'Andamento'),
        ('resolvido', 'Resolvido'),
    ]

    titulo = models.CharField(max_length=200)

    descricao = models.TextField()

    descricao_resolucao = models.TextField(blank=True)

    condominio = models.ForeignKey(
        Condominio,
        on_delete=models.CASCADE,
        related_name='chamados'
    )

    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='chamados_abertos'
    )

    urgente = models.BooleanField(default=False)

    imagem = models.ImageField(
        upload_to='chamados/',
        blank=True,
        null=True
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS,
        default='aberto'
    )

    criado_em = models.DateTimeField(auto_now_add=True)

    atualizado_em = models.DateTimeField(auto_now=True)

    resolvido_em = models.DateTimeField(
        blank=True,
        null=True
    )

    def __str__(self):
        return self.titulo

    def save(self, *args, **kwargs):
        status_anterior = None

        if self.pk:
            status_anterior = (
                Chamado.objects
                .filter(pk=self.pk)
                .values_list('status', flat=True)
                .first()
            )

        if self.status == 'resolvido' and not self.resolvido_em:
            self.resolvido_em = timezone.now()

        if (
            status_anterior == 'resolvido'
            and self.status != 'resolvido'
        ):
            self.resolvido_em = None

        super().save(*args, **kwargs)
        self.otimizar_imagem()

    def otimizar_imagem(self):
        if not self.imagem:
            return

        try:
            imagem = Image.open(self.imagem.path)
            imagem = ImageOps.exif_transpose(imagem)

            if (
                imagem.width <= TAMANHO_MAXIMO_IMAGEM[0]
                and imagem.height <= TAMANHO_MAXIMO_IMAGEM[1]
            ):
                return

            imagem.thumbnail(TAMANHO_MAXIMO_IMAGEM)
            formato = (imagem.format or '').upper()

            if formato in ['JPEG', 'JPG']:
                if imagem.mode not in ['RGB', 'L']:
                    imagem = imagem.convert('RGB')
                imagem.save(self.imagem.path, quality=82, optimize=True)
                return

            imagem.save(self.imagem.path, optimize=True)
        except Exception:
            return


class AccessLog(models.Model):

    username = models.CharField(max_length=150)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True
    )

    perfil = models.CharField(
        max_length=40,
        blank=True
    )

    ip = models.GenericIPAddressField(
        blank=True,
        null=True
    )

    user_agent = models.TextField(blank=True)

    sucesso = models.BooleanField(default=False)

    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        status = 'sucesso' if self.sucesso else 'falha'
        return f'{self.username} - {status} - {self.criado_em}'


class ActionLog(models.Model):

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True
    )

    perfil = models.CharField(
        max_length=40,
        blank=True
    )

    acao = models.CharField(max_length=80)

    detalhe = models.TextField(blank=True)

    ip = models.GenericIPAddressField(
        blank=True,
        null=True
    )

    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        usuario = self.usuario.username if self.usuario else 'sistema'
        return f'{usuario} - {self.acao} - {self.criado_em}'


class PushDevice(models.Model):

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='push_devices'
    )

    token = models.CharField(
        max_length=255,
        unique=True
    )

    plataforma = models.CharField(
        max_length=40,
        blank=True
    )

    ativo = models.BooleanField(default=True)

    criado_em = models.DateTimeField(auto_now_add=True)

    atualizado_em = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.usuario.username} - {self.plataforma}'
