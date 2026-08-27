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
pi install npm:pi-observational-memory
pi install npm:pi-mcp-adapter
pi install git:github.com/elpapi42/pi-fork

if ! command -v codebase-memory-mcp >/dev/null 2>&1; then
  cat <<'EOF'

AVISO: codebase-memory-mcp ainda não está no PATH.
Revise e instale o binário seguindo:
https://github.com/DeusData/codebase-memory-mcp#quick-start

O servidor já está declarado em mcp/mcp.json e será iniciado sob demanda pelo
pi-mcp-adapter assim que o binário existir.
EOF
fi

echo
echo "Bootstrap concluído. Reinicie o Pi para carregar todas as extensões."
