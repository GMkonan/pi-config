#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v pi >/dev/null 2>&1; then
  echo "pi não foi encontrado no PATH" >&2
  exit 1
fi

pi install "$root"
pi install npm:pi-web-access@0.30.0
pi install npm:@juicesharp/rpiv-voice@2.8.0
pi install npm:@juicesharp/rpiv-i18n@2.8.0
pi install npm:pi-observational-memory@3.1.4
pi install npm:pi-mcp-adapter@2.34.0
pi install git:github.com/elpapi42/pi-fork@e69725c396030cb9e3b119286beca53f47a2305f

"$root/scripts/patch-voice-model-selector.py"
"$root/scripts/patch-voice-performance.py"

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
  cat <<'EOF'

AVISO: codebase-memory-mcp não está no PATH.
Instale-o pelo gerenciador de sistema antes de usar o servidor declarado em
mcp/mcp.json. No NixOS deste setup, o flake fornece esse binário.

Instruções para outros sistemas:
https://github.com/DeusData/codebase-memory-mcp#quick-start
EOF
fi

echo
echo "Bootstrap concluído. Reinicie o Pi para carregar todas as extensões."
