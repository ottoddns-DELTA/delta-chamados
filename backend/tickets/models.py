from django.db import models
from django.utils import timezone


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

    condominio = models.ForeignKey(
        Condominio,
        on_delete=models.CASCADE,
        related_name='chamados'
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
