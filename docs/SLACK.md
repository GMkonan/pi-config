# Slack MCP

Este setup usa o servidor MCP oficial hospedado pela Slack:

```text
https://mcp.slack.com/mcp
```

O antigo package `@modelcontextprotocol/server-slack` não é usado porque sua
implementação de referência foi arquivada.

## Pré-requisitos

O cliente precisa de um Slack app interno ou publicado no Slack Marketplace.
Slack não aceita Dynamic Client Registration nem apps unlisted para este MCP.
Aprovação de um administrador pode ser exigida pelas políticas do workspace.

1. Crie ou abra um app em <https://api.slack.com/apps>.
2. Cadastre este redirect URL exatamente:

   ```text
   http://localhost:3118/callback
   ```

3. Em OAuth & Permissions, adicione os user-token scopes declarados em
   `mcp/mcp.json`. O setup inclui leitura, `chat:write` para enviar mensagens e
   `im:write` para criar/abrir DMs.
4. Copie o Client ID e o Client Secret do app.

## Credenciais

Não grave credenciais neste repositório. Antes de iniciar o Pi:

```bash
export SLACK_MCP_CLIENT_ID="seu-client-id"
export SLACK_MCP_CLIENT_SECRET="seu-client-secret"
pi
```

Também é possível obter o secret do 1Password sem salvá-lo no shell config:

```bash
export SLACK_MCP_CLIENT_ID="seu-client-id"
export SLACK_MCP_CLIENT_SECRET="$(op read 'op://VAULT/ITEM/client-secret')"
pi
```

## Autenticação e teste

No Pi:

```text
/reload
/mcp-auth konan-pi-config__slack
/mcp
```

Conclua o consentimento no navegador. No painel `/mcp`, o servidor deve aparecer
como `konan-pi-config__slack` e listar as tools permitidas pelos scopes.

Teste com um pedido explícito, por exemplo:

```text
Use o Slack MCP para procurar mensagens sobre <assunto>.
```

## Escrita no Slack

O setup permite o mínimo necessário para atuar como notifier:

- `chat:write` — enviar mensagens;
- `im:write` — criar/abrir uma DM antes do envio.

A identidade ou o ID pessoal do destinatário não deve ser versionado. O agente
pode localizar o usuário em runtime com as tools de busca e usar a conversa
retornada pelo Slack.

Ações adicionais continuam desabilitadas. Se forem necessárias, revise o impacto
e adicione somente os scopes correspondentes tanto no Slack app quanto em
`oauth.scope` dentro de `mcp/mcp.json`, por exemplo:

- `reactions:write` — adicionar reações;
- `channels:write`, `groups:write`, `mpim:write` — criar outras conversas;
- `canvases:read`, `canvases:write` — operar canvases.

Após qualquer mudança de scopes, reinstale/reautorize o app e execute novamente
`/mcp-auth`.

## Referências

- <https://docs.slack.dev/ai/slack-mcp-server>
- <https://api.slack.com/apps>
