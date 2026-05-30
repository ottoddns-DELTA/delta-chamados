# Funcionalidades

## Chamados

- Criar chamado com titulo, descricao, condominio, urgencia e foto.
- Preview da foto antes de enviar.
- Popup de sucesso ao criar chamado.
- Editar chamado depois de criado.
- Trocar ou remover foto do chamado.
- Iniciar atendimento.
- Resolver chamado com descricao obrigatoria do que foi feito.
- Historico de chamados resolvidos.
- Data/hora de abertura e resolucao.
- Nome de quem abriu.
- Nome de quem assumiu.

## Status

- `aberto`: chamado ainda nao assumido.
- `andamento`: chamado assumido por tecnico/admin.
- `resolvido`: chamado finalizado com descricao do atendimento.

## Push

O app recebe push quando:

- Novo chamado e criado.
- Um chamado e assumido.
- Um chamado e resolvido.

## Condominios

- Cadastro de condominio com nome e endereco.
- Lista ordenada alfabeticamente.
- Editar condominio.
- Excluir condominio somente como admin.

## Administracao

- Criar usuario.
- Editar usuario.
- Trocar senha.
- Excluir usuario.
- Ver logs de acesso.
- Ver auditoria de alteracoes no sistema.

## Auditoria

Quando um chamado e editado, o log registra:

- Quem editou.
- Data/hora.
- IP.
- Campos originais.
- Campos editados.

Exemplo:

```text
Chamado #12: Camera 12 fora
Original:
- Descricao: texto antigo
Editado:
- Descricao: texto novo
```

## IA para texto

Existe endpoint para melhorar texto:

```text
/api/melhorar-texto/
```

Modelo atual configurado por variavel:

```text
GEMINI_MODEL
```

Chave configurada por:

```text
GEMINI_API_KEY
```
