#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v pi >/dev/null 2>&1; then
  echo "pi não foi encontrado no PATH" >&2
  exit 1
fi

pi install "$root"
pi install npm:pi-web-access
pi install npm:@juicesharp/rpiv-voice
pi install npm:@juicesharp/rpiv-i18n
pi install npm:pi-observational-memory
pi install npm:pi-mcp-adapter
pi install git:github.com/elpapi42/pi-fork

"$root/scripts/patch-voice-model-selector.py"

config_home="${XDG_CONFIG_HOME:-$HOME/.config}"
if [[ "$config_home" != /* ]]; then
  config_home="$HOME/.config"
fi
locale_config="$config_home/rpiv-i18n/locale.json"
if [[ ! -e "$locale_config" ]]; then
  mkdir -p "$(dirname "$locale_config")"
  printf '%s\n' '{ "locale": "pt-BR" }' > "$locale_config"
  chmod 600 "$locale_config"
fi

voice_config="$config_home/rpiv-voice/voice.json"
if [[ ! -e "$voice_config" ]]; then
  mkdir -p "$(dirname "$voice_config")"
  printf '%s\n' '{ "whisperModelType": "small" }' > "$voice_config"
  chmod 600 "$voice_config"
fi

if ! command -v codebase-memory-mcp >/dev/null 2>&1; then
  if command -v nix >/dev/null 2>&1; then
    nix profile add github:DeusData/codebase-memory-mcp
  else
    cat <<'EOF'

AVISO: codebase-memory-mcp ainda não está no PATH e Nix não está disponível.
Revise e instale o binário seguindo:
https://github.com/DeusData/codebase-memory-mcp#quick-start

O servidor já está declarado em mcp/mcp.json e será iniciado sob demanda pelo
pi-mcp-adapter assim que o binário existir.
EOF
  fi
fi

echo
echo "Bootstrap concluído. Reinicie o Pi para carregar todas as extensões."
