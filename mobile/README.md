# Delta Chamados Mobile

App Expo para técnicos acompanharem chamados abertos e receberem push quando um novo chamado for criado.

## Configuração

O app aponta para:

```txt
https://deltachamados.up.railway.app
```

Se a URL do backend mudar, altere `extra.apiUrl` em `app.json`.

## Rodar local

```powershell
cd mobile
npm install
npx expo start
```

Instale o app Expo Go no Android e leia o QR Code.

## Gerar APK interno

```powershell
cd mobile
npm install
npx eas login
npx eas init
npx eas build --platform android --profile preview
```

O perfil `preview` gera APK para instalação manual.
