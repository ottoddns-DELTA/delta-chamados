# Variaveis de ambiente

## Backend Railway

```text
DATABASE_URL=postgres://...
DEBUG=False
SECRET_KEY=...
ALLOWED_HOSTS=delta-chamados-production.up.railway.app,deltachamados.up.railway.app,.up.railway.app
CORS_ALLOWED_ORIGINS=https://deltachamados.up.railway.app,https://delta-chamados-production.up.railway.app
CSRF_TRUSTED_ORIGINS=https://deltachamados.up.railway.app,https://delta-chamados-production.up.railway.app
LOGIN_RATE_LIMIT_ATTEMPTS=5
LOGIN_RATE_LIMIT_WINDOW=900
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash-lite
```

## Frontend Railway

```text
NEXT_PUBLIC_API_URL=https://delta-chamados-production.up.railway.app
```

## Mobile Expo

Configurado em `mobile/app.json`:

```text
extra.apiUrl=https://delta-chamados-production.up.railway.app
```

Projeto EAS:

```text
d90008ad-f73c-4bd8-8c64-fab31a6ddaa7
```

Pacote Android:

```text
com.deltacondominios.chamados
```

## Firebase/FCM

Arquivo local:

```text
mobile/google-services.json
```

Esse arquivo e usado para push Android no build do EAS.

Nao publicar chaves privadas fora do repositorio autorizado.
