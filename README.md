# Pi config

Configuração compartilhável do meu [Pi Coding Agent](https://pi.dev/) na forma
de um **Pi Package**.

## O que um Pi Package compartilha

O manifest `package.json` distribui oficialmente:

- extensions;
- skills;
- prompt templates;
- themes.

Este package também declara `mcp/mcp.json`, consumido pelo `pi-mcp-adapter`.
Configurações pessoais como provider/model, credenciais e a lista de packages
externos não são recursos nativos do manifest; ficam documentadas em
`config/settings.example.json` e são instaladas por `scripts/bootstrap.sh`.
O bootstrap não sobrescreve provider, model ou credenciais existentes. As
versões dos packages externos são fixadas para que uma instalação limpa seja
reproduzível e não receba mudanças incompatíveis silenciosamente.

## Estrutura

```text
extensions/       extensões locais
  task-title.ts   título da tarefa e estado do Pi no terminal/tmux
  working-indicator.ts  spinner padrão com frases do Pi Everywhere
prompts/          comandos/prompt templates
skills/           skills globais distribuídas pelo package
themes/           temas do TUI
mcp/              servidores MCP declarados pelo package
agents/           política e futuras definições de agents
config/           configuração de referência, sem segredos
docs/TOOLS.md     inventário e decisões sobre ferramentas
scripts/          bootstrap do ambiente
```

## Instalação local

```bash
git clone https://github.com/GMkonan/pi-config ~/pi-config
~/pi-config/scripts/bootstrap.sh
```

Para instalar apenas os recursos locais:

```bash
pi install ~/pi-config
```

Também é possível instalar diretamente sem manter um clone editável:

```bash
pi install git:github.com/GMkonan/pi-config
```

Reinicie o Pi após instalar ou atualizar extensões.

O bootstrap fixa `rpiv-voice` e `rpiv-i18n` em `2.11.0`. O Voice usa o
Whisper multilingual `base` fornecido pelo upstream, sem patches de aplicação
ou seleção alternativa de modelo. No NixOS, `scripts/repair-voice-nixos.sh`
ajusta apenas o runtime path dos addons npm para o caminho estável do `nix-ld`.
O idioma permanece em
`~/.config/rpiv-i18n/locale.json`, criado como `pt-BR` em instalações novas e
alterável por `/languages`.

## MCP

O core do Pi não implementa MCP. Este setup instala `pi-mcp-adapter`, que lê o
`mcp/mcp.json` declarado pelo package e apresenta os servidores através de uma
tool proxy lazy. O binário `codebase-memory-mcp` deve estar no `PATH`.

No NixOS deste setup, o flake instala o binário declarativamente. O bootstrap
apenas verifica se ele está no `PATH`; ele não modifica o perfil Nix nem instala
dependências do sistema.

Veja [docs/TOOLS.md](docs/TOOLS.md) para o estado de cada ferramenta e os
critérios para considerar um MCP Gateway no futuro. A configuração e autenticação
do Slack estão em [docs/SLACK.md](docs/SLACK.md).

## Segurança

Pi Packages podem executar código com acesso completo ao sistema. Revise toda
extension antes de instalar. Não versione `auth.json`, tokens, chaves, arquivos
`.env` ou configurações MCP com credenciais.
