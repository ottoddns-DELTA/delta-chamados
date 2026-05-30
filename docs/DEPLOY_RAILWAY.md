# Deploy Railway

## Estrutura no Railway

O projeto usa Railway para hospedar:

- Backend Django/API.
- Frontend Next.js.
- Postgres.

## Backend

Servico responsavel pela API:

```text
https://delta-chamados-production.up.railway.app
```

Pontos importantes:

- Precisa ter `DATABASE_URL` apontando para o Postgres.
- Precisa rodar migrations apos alteracoes de banco.
- Precisa ter as variaveis de seguranca configuradas.

Comando de migracao, quando necessario:

```powershell
python backend/manage.py migrate
```

No Railway isso deve rodar dentro do servico backend, usando o ambiente de producao.

## Frontend

Servico responsavel pela interface web:

```text
https://deltachamados.up.railway.app
```

Variavel importante:

```text
NEXT_PUBLIC_API_URL=https://delta-chamados-production.up.railway.app
```

## Push para deploy

```powershell
cd "C:\Users\tidel\OneDrive\Desktop\delta-chamados"
git add .
git commit -m "Mensagem do deploy"
git push origin main
```

## Verificacao apos deploy

1. Abrir a web.
2. Fazer login como admin.
3. Conferir condominios.
4. Abrir chamado teste.
5. Conferir se o app recebeu push.
6. Resolver chamado e conferir historico/log.
