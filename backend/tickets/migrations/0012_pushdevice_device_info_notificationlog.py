from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('tickets', '0011_chamado_assumido_por'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='pushdevice',
            name='fabricante',
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name='pushdevice',
            name='modelo',
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name='pushdevice',
            name='sistema',
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.CreateModel(
            name='NotificationLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('evento', models.CharField(choices=[('enviado', 'Enviado'), ('recebido', 'Recebido no app'), ('aberto', 'Aberto pelo usuario'), ('falha', 'Falha')], max_length=20)),
                ('titulo', models.CharField(blank=True, max_length=200)),
                ('corpo', models.TextField(blank=True)),
                ('urgente', models.BooleanField(default=False)),
                ('plataforma', models.CharField(blank=True, max_length=40)),
                ('modelo', models.CharField(blank=True, max_length=120)),
                ('fabricante', models.CharField(blank=True, max_length=120)),
                ('sistema', models.CharField(blank=True, max_length=120)),
                ('detalhe', models.TextField(blank=True)),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('chamado', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='notification_logs', to='tickets.chamado')),
                ('device', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='notification_logs', to='tickets.pushdevice')),
                ('usuario', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='notification_logs', to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
