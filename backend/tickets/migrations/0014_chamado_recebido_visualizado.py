from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tickets', '0013_chamado_editado_por'),
    ]

    operations = [
        migrations.AddField(
            model_name='chamado',
            name='recebido_em',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='chamado',
            name='visualizado_em',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
