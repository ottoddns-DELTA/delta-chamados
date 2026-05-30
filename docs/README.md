# Delta Chamados - Documentacao

Sistema interno para abertura, acompanhamento e resolucao de chamados tecnicos da Delta Condominios.

## Partes do projeto

- `backend/`: API Django + Django REST Framework.
- `frontend/`: painel web em Next.js.
- `mobile/`: app Android em Expo/React Native.

## Links principais

- Web atual: https://deltachamados.up.railway.app
- API atual: https://delta-chamados-production.up.railway.app
- Repositorio: https://github.com/ottoddns-DELTA/delta-chamados

## Documentos

- [Deploy Railway](./DEPLOY_RAILWAY.md)
- [Android APK](./ANDROID_APK.md)
- [Usuarios e permissoes](./USUARIOS_E_PERMISSOES.md)
- [Funcionalidades](./FUNCIONALIDADES.md)
- [Seguranca](./SEGURANCA.md)
- [Variaveis de ambiente](./VARIAVEIS_AMBIENTE.md)
- [Visual e identidade](./VISUAL.md)
- [Historico tecnico](./HISTORICO_TECNICO.md)

## Rotina rapida

Depois de alterar codigo:

```powershell
cd "C:\Users\tidel\OneDrive\Desktop\delta-chamados"
git status
git add .
git commit -m "Descricao curta da alteracao"
git push origin main
```

O Railway deve fazer deploy automatico apos o push.
