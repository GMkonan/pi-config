#!/usr/bin/env bash
set -euo pipefail

# npm's prebuilt Voice addons target FHS Linux. On NixOS, make their runtime
# libraries resolve through the stable nix-ld path without pinning store hashes.
[[ -e /etc/NIXOS ]] || exit 0

nix_ld_lib=/run/current-system/sw/share/nix-ld/lib
if [[ ! -e "$nix_ld_lib/libasound.so.2" || ! -e "$nix_ld_lib/libstdc++.so.6" ]]; then
  echo "AVISO: nix-ld não expõe libasound.so.2 e libstdc++.so.6; o Voice precisa dessas libraries no NixOS" >&2
  exit 0
fi

patchelf_bin="$(command -v patchelf || true)"
if [[ -z "$patchelf_bin" ]]; then
  for candidate in /nix/store/*-patchelf-*/bin/patchelf; do
    if [[ -x "$candidate" ]]; then
      patchelf_bin="$candidate"
      break
    fi
  done
fi
if [[ -z "$patchelf_bin" ]]; then
  echo "AVISO: patchelf não foi encontrado; o Voice não foi reparado para NixOS" >&2
  exit 0
fi

agent_dir="${PI_CODING_AGENT_DIR:-$HOME/.pi/agent}"
npm_root="$agent_dir/npm/node_modules"
shopt -s nullglob
native_dirs=(
  "$npm_root"/@decibri/decibri-linux-*
  "$npm_root"/sherpa-onnx-linux-*
)

if ((${#native_dirs[@]} == 0)); then
  echo "Addons nativos do Voice não foram encontrados em $npm_root" >&2
  exit 1
fi

patched=0
for dir in "${native_dirs[@]}"; do
  while IFS= read -r -d '' library; do
    "$patchelf_bin" --set-rpath "\$ORIGIN:$nix_ld_lib" "$library"
    ((patched += 1))
  done < <(find "$dir" -maxdepth 1 -type f \( -name '*.node' -o -name '*.so' \) -print0)
done

if ((patched == 0)); then
  echo "Nenhum addon nativo do Voice foi encontrado para reparar" >&2
  exit 1
fi

echo "Voice: $patched addons nativos reparados para NixOS"
