#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v pi >/dev/null 2>&1; then
  echo "pi não foi encontrado no PATH" >&2
  exit 1
fi

agent_dir="${PI_CODING_AGENT_DIR:-$HOME/.pi/agent}"
settings_file="$agent_dir/settings.json"
obsolete_sources="$(node - "$settings_file" <<'NODE'
const fs = require("node:fs");
const path = require("node:path");
const settingsPath = process.argv[2];
const settings = fs.existsSync(settingsPath)
  ? JSON.parse(fs.readFileSync(settingsPath, "utf8"))
  : {};
const obsoletePackages = ["pi-fork", "pi-lsp-adapter"];
const sources = Array.isArray(settings.packages)
  ? settings.packages.filter(source =>
      typeof source === "string" && obsoletePackages.some(name => source.includes(name)),
    )
  : [];
settings.enableInstallTelemetry = false;
delete settings["pi-fork"];
fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, { mode: 0o600 });
fs.chmodSync(settingsPath, 0o600);
process.stdout.write(sources.join("\n"));
NODE
)"

while IFS= read -r source; do
  [[ -n "$source" ]] && pi remove "$source"
done <<< "$obsolete_sources"

pi install "$root"
pi install npm:pi-web-access@0.31.0
pi install npm:@juicesharp/rpiv-voice@2.11.0
pi install npm:@juicesharp/rpiv-i18n@2.11.0
pi install npm:pi-observational-memory@3.1.4
pi install npm:pi-mcp-adapter@2.37.0
"$root/scripts/repair-voice-nixos.sh"

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
if [[ -e "$voice_config" ]]; then
  node - "$voice_config" <<'NODE'
const fs = require("node:fs");
const file = process.argv[2];
const config = JSON.parse(fs.readFileSync(file, "utf8"));
delete config.whisperModelType;
fs.writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`);
fs.chmodSync(file, 0o600);
NODE
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
