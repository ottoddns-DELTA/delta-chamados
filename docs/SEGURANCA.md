# Seguranca

## Medidas ja aplicadas

- Autenticacao por token.
- Perfis de permissao: admin, monitoramento, tecnico.
- Logs de acesso com IP e horario.
- Auditoria de alteracoes.
- CORS restrito por variavel de ambiente.
- Headers de seguranca no Django.
- HTTPS por proxy do Railway.
- Cookies seguros quando `DEBUG=False`.
- Limite de tentativas de login.

## Limite de login

Configuracao:

```text
LOGIN_RATE_LIMIT_ATTEMPTS=5
LOGIN_RATE_LIMIT_WINDOW=900
```

Funcionamento:

- Conta erro por IP + usuario.
- Depois de 5 erros, bloqueia por 900 segundos.
- 900 segundos = 15 minutos.
- Ao acertar a senha, o contador zera.

## Variaveis obrigatorias em producao

```text
DEBUG=False
SECRET_KEY=chave-grande-e-secreta
ALLOWED_HOSTS=delta-chamados-production.up.railway.app,deltachamados.up.railway.app,.up.railway.app
CORS_ALLOWED_ORIGINS=https://deltachamados.up.railway.app,https://delta-chamados-production.up.railway.app
CSRF_TRUSTED_ORIGINS=https://deltachamados.up.railway.app,https://delta-chamados-production.up.railway.app
LOGIN_RATE_LIMIT_ATTEMPTS=5
LOGIN_RATE_LIMIT_WINDOW=900
```

## Gerar SECRET_KEY

No PowerShell:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

## Proximas melhorias recomendadas

- Trocar senhas provisorias.
- Configurar backup do Postgres.
- Armazenar imagens fora do container, como Cloudinary, S3, R2 ou Supabase Storage.
- Usar Redis ou Django Axes para rate limit mais robusto.
- Rever usuarios ativos periodicamente.
