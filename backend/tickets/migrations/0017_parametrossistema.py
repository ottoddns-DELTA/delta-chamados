from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tickets', '0016_chamado_editado_em'),
    ]

    operations = [
        migrations.CreateModel(
            name='ParametrosSistema',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sla_ativo', models.BooleanField(default=True)),
                ('sla_urgente_atencao_min', models.PositiveIntegerField(default=10)),
                ('sla_urgente_critico_min', models.PositiveIntegerField(default=30)),
                ('sla_normal_atencao_min', models.PositiveIntegerField(default=60)),
                ('sla_normal_critico_min', models.PositiveIntegerField(default=120)),
                ('atualizado_em', models.DateTimeField(auto_now=True)),
            ],
        ),
    ]
