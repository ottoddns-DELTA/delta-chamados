# Historico tecnico

## Decisoes importantes

- Banco em producao via Postgres no Railway.
- App Android feito com Expo/React Native.
- Push Android via Expo Notifications + Firebase/FCM.
- IA de melhoria de texto via Gemini.
- Autenticacao por token.
- Perfis internos: admin, monitoramento, tecnico.
- Auditoria com logs de acesso e logs de acao.

## Marcos recentes

- Login web redesenhado.
- Dashboard web unificado no visual slate.
- Condominios persistentes no banco.
- Chamados resolvidos mantidos no historico.
- Edicao de chamados apos criacao.
- Preview de imagem no upload.
- Resolucao com descricao obrigatoria.
- App Android com push.
- Status de push no app em pilula.
- Registro de aparelho corrigido para token duplicado.
- Campo `assumido_por` no chamado.
- Push quando chamado e assumido/resolvido.
- Auditoria de edicao de chamado com antes/depois.
- Seguranca: CORS, headers e rate limit de login.

## APKs conhecidos

Ultimo APK citado:

```text
https://expo.dev/artifacts/eas/eDHkqAf7CzzRLRymkkEjKz.apk
```

## Observacoes

As imagens de chamados ainda usam armazenamento local do backend:

```text
MEDIA_ROOT=backend/media
```

Em Railway, arquivos locais podem sumir apos deploy/restart. Melhorar isso com Cloudinary, S3, R2 ou Supabase Storage.
