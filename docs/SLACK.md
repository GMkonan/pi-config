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

3. Em OAuth & Permissions, adicione os user-token scopes de leitura declarados
   em `mcp/mcp.json`.
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

O setup começa read-only por segurança. Para permitir ações de escrita, revise
o impacto e adicione somente os scopes necessários tanto no Slack app quanto em
`oauth.scope` dentro de `mcp/mcp.json`:

- `chat:write` — enviar mensagens;
- `reactions:write` — adicionar reações;
- `channels:write`, `groups:write`, `im:write`, `mpim:write` — criar conversas;
- `canvases:read`, `canvases:write` — operar canvases.

Depois, reinstale/reautorize o app e execute novamente `/mcp-auth`.

## Referências

- <https://docs.slack.dev/ai/slack-mcp-server>
- <https://api.slack.com/apps>
