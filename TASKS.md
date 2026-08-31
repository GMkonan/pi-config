# Tasks

Pendências pequenas do setup do Pi, para atacar uma por vez.

## Experiência de uso

- [x] **Voice com Whisper small:** adicionar seletor versionado `base`/`small` ao `rpiv-voice`, manter os modelos separados e configurar o modelo `small` multilingual int8.
- [x] **Performance do voice:** manter o recognizer em cache, evitar redecodificações parciais repetidas no `small` e finalizar corretamente ao pressionar Enter.
- [ ] **Benchmark do voice:** comparar precisão e latência de `base` e `small` com frases fixas em português e termos técnicos.
- [ ] **Vocabulário do voice:** após o benchmark, avaliar correções determinísticas para termos recorrentes como MCP, NixOS, worktree e Dev Container.
- [ ] **Indicador de imagem colada:** ao colar uma imagem no editor, exibir um marcador destacado como `image 1`, `image 2`, etc., semelhante ao OpenCode e ao `paste-highlight` usado para textos grandes.
- [ ] **Teclas no tmux:** habilitar `extended-keys` e formato `csi-u` para distinguir Enter, Shift+Enter e Ctrl+Enter.

## Dev Containers e sessões

- [ ] **Roteador de Dev Container:** manter o Pi no host, mas executar `bash` pelo `devcontainer exec`, com detecção explícita da variante e indicação no footer.
- [ ] **Pi Fork no container:** carregar somente o roteador de Dev Container nos filhos quando o projeto exigir, preservando o modo offline.
- [ ] **Helper `pi-sesh`:** criar sessões nomeadas em tmux, com worktree opcional, retomada segura e compatibilidade com o fluxo Graphite.
- [ ] **Concorrência segura:** garantir uma sessão por JSONL e uma worktree por agente que edita; evitar múltiplos escritores no mesmo checkout.

## Celular

- [ ] **Acesso móvel básico:** habilitar Tailscale e SSH restrito à VPN, usando tmux para retomar sessões pelo celular.
- [ ] **Interface móvel:** testar Piface ou outra PWA de Pi RPC somente pela VPN; nunca expor o RPC diretamente à internet.
- [ ] **Voz pelo celular:** avaliar ditado do teclado ou captura de áudio pela PWA, pois `/voice` via SSH usa o microfone do computador.

## Extensões e MCPs

- [ ] **Trial de LSP:** medir se diagnósticos e code actions economizam iterações reais em projetos TypeScript.
- [ ] **Trial de Chrome DevTools:** avaliar console, network, DOM e screenshots para depuração do `zapper-dashboard`.
- [ ] **Codebase Memory:** testar em cerca de dez perguntas de arquitetura/impacto e manter somente se superar `rg` e leituras normais.
- [ ] **Escopo por projeto:** carregar Slack, banco de dados e outros MCPs apenas onde forem necessários, com escrita sujeita a aprovação.
- [ ] **MCP Gateway:** reavaliar somente quando houver vários clientes/servidores ou necessidade real de autenticação, política e telemetria centralizadas.

## Segurança e notificações

- [ ] **Segredos do Dev Container:** retirar `GITHUB_TOKEN` dos build args, revisar injeção de tokens e rotacionar credenciais materializadas durante a auditoria.
- [ ] **Slack webhook:** remover o webhook aparentemente hardcoded de `supervisor.ts`, revogar/rotacionar se ainda estiver ativo e usar secret store.
- [ ] **Slack MCP:** resolver o client secret por comando/1Password em vez de mantê-lo no ambiente herdado pelo `pi-fork`.
- [ ] **Notifier Slack:** usar um bot dedicado quando for necessário gerar notificação real; mensagens self-authored pelo OAuth do usuário apenas aparecem no canal/DM.

## Concluído

- [x] Atualizar `rpiv-voice` para 2.8.0.
- [x] Instalar `rpiv-i18n` 2.8.0 e fixar `pt-BR` para evitar autodetecção do idioma.
- [x] Reaplicar e validar os patches das bibliotecas nativas do voice no NixOS.
