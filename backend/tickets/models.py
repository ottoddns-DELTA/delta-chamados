from django.db import models


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

    def __str__(self):
        return self.titulo