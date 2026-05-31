from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tickets', '0015_chamado_imagem_resolucao'),
    ]

    operations = [
        migrations.AddField(
            model_name='chamado',
            name='editado_em',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
