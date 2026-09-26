# Ferramentas e decisões

Registro das peças que compõem o setup e das candidatas para adoção futura.

## Ativas

| Ferramenta | Tipo | Papel |
|---|---|---|
| `custom-header` | extension local | Mostrar sessão, modelo, thinking e contagem dos recursos carregados sem esconder os atalhos essenciais. |
| `custom-footer` | extension local | Mostrar projeto, branch, estado completo do Git, modelo, statuses de outras extensões e uso de contexto. |
| `working-indicator` | extension local | Manter o spinner padrão do Pi e alternar as mesmas frases de trabalho do Pi Everywhere. |
| `paste-highlight` | extension local | Destacar blocos colados e representar imagens do clipboard como `[image N]` antes de restaurar seus paths no envio. |
| `task-title` | extension local | Exibir no terminal/tmux o nome da sessão e distinguir os estados ocioso, trabalhando e aguardando interação. |
| `/review` | prompt template | Revisar mudanças staged sem alterá-las. |
| `frontend-design` | skill global | Orientar a criação de interfaces visuais distintas e prontas para produção; distribuída pelo próprio `pi-config`. |
| `catppuccin-mocha` | theme | Tema do TUI, incluindo cores explícitas para busca e scrollbar fullscreen. |
| `pi-web-access` 0.31.0 | Pi Package externo | Pesquisa e leitura de conteúdo web. |
| `@juicesharp/rpiv-voice` 2.11.0 | Pi Package externo | Ditado local em `pt-BR` com o Whisper multilingual base upstream; no NixOS, somente os runtime paths dos addons npm são ajustados para o `nix-ld`. |
| `@juicesharp/rpiv-i18n` 2.11.0 | Pi Package externo | Fixa `pt-BR` para o Voice e localiza a interface das extensões rpiv. |
| `pi-observational-memory` 3.1.4 | Pi Package externo | Preservar decisões e continuidade através de compactions. |
| `pi-mcp-adapter` 2.37.0 | Pi Package externo | Cliente MCP lazy com uma superfície proxy pequena, necessário porque MCP não faz parte do core do Pi. |
| `codebase-memory-mcp` | servidor MCP local | Índice persistente e knowledge graph do codebase. Declarado em `mcp/mcp.json` e instalado declarativamente pelo flake do sistema. |
| Slack MCP oficial | servidor MCP remoto | Busca, leitura e envio de mensagens via OAuth. `chat:write` e `im:write` permitem notificações e DMs; requer Slack app e credenciais descritos em `docs/SLACK.md`. |

## Decisões de arquitetura

- Não há plan mode, agents ou subagentes globais. Planejamento e execução usam a
  sessão principal e as ferramentas normais do Pi.
- O MCP adapter mantém schemas de tools fora do contexto até serem necessários.
- `pi-web-access` 0.31.0 continua registrando os tools de forma eager neste pacote
  Nix do Pi: a detecção upstream de 0.86.1+ falha ao resolver o próprio pacote,
  embora pesquisa e leitura funcionem normalmente.
- A telemetria de instalação e os headers de atribuição ficam desabilitados por
  `enableInstallTelemetry: false`; verificações normais de atualização continuam.
- Configuração sensível, tokens e `auth.json` nunca pertencem a este repositório.

## Candidata: MCP Gateway

**Estado:** não adotado.

Um gateway externo pode agregar, autenticar, filtrar e observar vários servidores
MCP. Neste setup ele seria redundante enquanto o `pi-mcp-adapter` já oferece
descoberta lazy e uma superfície constante para o modelo.

Reavaliar quando houver uma destas necessidades:

1. vários clientes compartilhando os mesmos servidores MCP;
2. autenticação ou políticas centralizadas;
3. servidores remotos e roteamento/session affinity;
4. telemetria centralizada;
5. muitos servidores exigindo administração fora do Pi.

Se adotado, o gateway entra entre `pi-mcp-adapter` e os servidores; o restante do
setup não precisa mudar.

## Possíveis ferramentas futuras

Documentar aqui antes de adotar, incluindo:

- problema que resolve;
- sobreposição com ferramentas existentes;
- impacto de tokens e chamadas de modelo;
- permissões e dados acessados;
- forma de instalação, versão/ref e estratégia de atualização;
- critérios objetivos para manter ou remover.
