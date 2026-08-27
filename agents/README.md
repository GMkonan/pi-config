# Agents

Não há agents ativos neste setup.

- O planejamento interativo é feito pela extensão `plan-mode` na sessão principal.
- Implementação, investigação e revisão podem ser delegadas com `pi-fork`.
- Os antigos agents `plan` e `build` foram removidos para evitar sobreposição.

O Pi Package oficial carrega extensions, skills, prompts e themes. Agents são
um recurso de extensões de subagents, não do manifest principal do Pi. Caso
agents especializados voltem a ser necessários, suas definições podem ficar
neste diretório, mas a extensão escolhida deverá declarar ou descobrir este
caminho explicitamente.
