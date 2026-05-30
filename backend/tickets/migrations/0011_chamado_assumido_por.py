from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('tickets', '0010_chamado_descricao_resolucao'),
    ]

    operations = [
        migrations.AddField(
            model_name='chamado',
            name='assumido_por',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='chamados_assumidos',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
