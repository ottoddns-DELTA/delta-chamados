from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tickets', '0014_chamado_recebido_visualizado'),
    ]

    operations = [
        migrations.AddField(
            model_name='chamado',
            name='imagem_resolucao',
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to='resolucoes/',
            ),
        ),
    ]
