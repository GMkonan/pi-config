# Ferramentas e decisões

Registro das peças que compõem o setup e das candidatas para adoção futura.

## Ativas

| Ferramenta | Tipo | Papel |
|---|---|---|
| `custom-header` / `custom-footer` | extensions locais | Exibir projeto, branch, modelo, modo e uso de contexto. |
| `paste-highlight` | extension local | Destacar referências a blocos colados no editor. |
| `plan-mode` | extension local | Planejamento read-only na sessão principal, com bash allowlisted e execução acompanhada. |
| `/review` | prompt template | Revisar mudanças staged sem alterá-las. |
| `catppuccin-mocha` | theme | Tema do TUI. |
| `pi-web-access` | Pi Package externo | Pesquisa e leitura de conteúdo web. |
| `@juicesharp/rpiv-voice` | Pi Package externo | Ditado por voz. |
| `pi-observational-memory` | Pi Package externo | Preservar decisões e continuidade através de compactions. |
| `pi-fork` | Pi Package externo | Delegar trabalho ruidoso a processos filhos que herdam o branch da sessão. |
| `pi-mcp-adapter` | Pi Package externo | Cliente MCP lazy com uma superfície proxy pequena, necessário porque MCP não faz parte do core do Pi. |
| `codebase-memory-mcp` | servidor MCP local | Índice persistente e knowledge graph do codebase. Declarado em `mcp/mcp.json`. |

## Decisões de arquitetura

- Observational memory roda na sessão principal. Não é carregada deliberadamente
  nos forks efêmeros, evitando chamadas de observer/reflector sem benefício.
- `plan-mode` substitui o antigo subagent `plan`.
- O subagent `build`, o agent `plan`, a extensão local `subagent` e o prompt
  `/plan-build` foram removidos. `pi-fork` cobre a delegação necessária sem uma
  segunda taxonomia de agents.
- O MCP adapter mantém schemas de tools fora do contexto até serem necessários.
- Configuração sensível, tokens e `auth.json` nunca pertencem a este repositório.

## Candidata: MCP Gateway

**Estado:** não adotado.

Um gateway externo pode agregar, autenticar, filtrar e observar vários servidores
MCP. Neste setup ele seria redundante enquanto existe somente o
`codebase-memory-mcp`, pois o `pi-mcp-adapter` já oferece descoberta lazy e uma
superfície constante para o modelo.

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
