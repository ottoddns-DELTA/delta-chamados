# Android APK

O app Android fica na pasta:

```text
mobile/
```

## Tecnologias

- Expo
- React Native
- EAS Build
- Expo Notifications
- Firebase/FCM para push Android

## Gerar APK preview

```powershell
cd "C:\Users\tidel\OneDrive\Desktop\delta-chamados\mobile"
npx eas-cli build --platform android --profile preview
```

O perfil `preview` gera APK porque `mobile/eas.json` tem:

```json
"preview": {
  "android": {
    "buildType": "apk"
  }
}
```

## Ultimo APK gerado conhecido

```text
https://expo.dev/artifacts/eas/eDHkqAf7CzzRLRymkkEjKz.apk
```

## Instalar sem USB

1. Baixar o APK.
2. Renomear para `Delta-Chamados.apk`.
3. Enviar por WhatsApp, Drive, OneDrive ou e-mail.
4. Abrir o arquivo no celular.
5. Liberar instalacao de apps desconhecidos, se o Android pedir.
6. Fazer login com o usuario correto.

## Instalar via USB/ADB

```powershell
adb devices
adb install -r "$env:USERPROFILE\Downloads\deltachamados.apk"
```

Com varios celulares conectados:

```powershell
adb devices
adb -s SERIAL_DO_CELULAR install -r "$env:USERPROFILE\Downloads\deltachamados.apk"
```

## Push

Ao fazer login, o app registra automaticamente o token de push do aparelho.

O status aparece no topo:

- `Alertas Ativos`: token registrado.
- `Alertas Inativos`: tocar na pilula para ver o motivo.
- `Verificando`: app esta tentando registrar.

Se trocar de usuario no mesmo celular, o backend atualiza o token para o usuario novo.
