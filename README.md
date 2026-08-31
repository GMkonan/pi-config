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
O bootstrap não sobrescreve provider, model ou credenciais existentes.

## Estrutura

```text
extensions/       extensões locais
  plan-mode/      modo de planejamento read-only
prompts/          comandos/prompt templates
themes/           temas do TUI
mcp/              servidores MCP declarados pelo package
agents/           política e futuras definições de agents
config/           configuração de referência, sem segredos
docs/TOOLS.md     inventário e decisões sobre ferramentas
scripts/          bootstrap do ambiente
```

## Instalação local

```bash
git clone <este-repositório> ~/pi-config
~/pi-config/scripts/bootstrap.sh
```

Para instalar apenas os recursos locais:

```bash
pi install ~/pi-config
```

Depois que houver um remote Git, também será possível instalar diretamente:

```bash
pi install git:github.com/GMkonan/pi-config
```

Reinicie o Pi após instalar ou atualizar extensões.

No NixOS, depois de atualizar `rpiv-voice`, execute
`scripts/repatch-voice.sh`. O script reaplica tanto o seletor local de modelo
quanto os patches das bibliotecas nativas.

O bootstrap instala `@juicesharp/rpiv-i18n`, seleciona `pt-BR` e configura o
Whisper `small` em instalações novas. O idioma fica em
`~/.config/rpiv-i18n/locale.json` e pode ser alterado por `/languages`; o modelo
fica em `~/.config/rpiv-voice/voice.json`:

```json
{ "whisperModelType": "small" }
```

O `rpiv-voice` 2.8.0 ainda fixa o modelo `base` upstream. Por isso
`scripts/patch-voice-model-selector.py` aplica um patch versionado que aceita
somente `base` ou `small`, mantendo-os em diretórios separados. Para tornar o
`small` utilizável, `scripts/patch-voice-performance.py` mantém o recognizer em
cache, desativa redecodificações parciais caras nesse modelo e aguarda a
transcrição final ao pressionar Enter. Os scripts falham com segurança quando
a versão instalada muda e exigem revisão antes de alterar uma versão futura.

## MCP

O core do Pi não implementa MCP. Este setup instala `pi-mcp-adapter`, que lê o
`mcp/mcp.json` declarado pelo package e apresenta os servidores através de uma
tool proxy lazy. O binário `codebase-memory-mcp` deve estar no `PATH`.

No NixOS ele é instalado por:

```bash
nix profile add github:DeusData/codebase-memory-mcp
```

O bootstrap executa essa instalação automaticamente quando o binário estiver
ausente e Nix estiver disponível.

Veja [docs/TOOLS.md](docs/TOOLS.md) para o estado de cada ferramenta e os
critérios para considerar um MCP Gateway no futuro. A configuração e autenticação
do Slack estão em [docs/SLACK.md](docs/SLACK.md).

## Segurança

Pi Packages podem executar código com acesso completo ao sistema. Revise toda
extension antes de instalar. Não versione `auth.json`, tokens, chaves, arquivos
`.env` ou configurações MCP com credenciais.
