#!/usr/bin/env bash
# Reaplica patchelf nos bindings nativos do rpiv-voice (decibri + sherpa-onnx)
# Necessário no NixOS porque os .node/.so esperam libasound.so.2 e libstdc++.so.6
# em caminhos padrão de distros convencionais.
# Rode novamente depois de `pi install`/`pi update` se o /voice voltar a falhar.

set -euo pipefail

PATCH=$(command -v patchelf || ls /nix/store/*patchelf*/bin/patchelf 2>/dev/null | head -1)
if [ -z "$PATCH" ]; then
	echo "ERRO: patchelf não encontrado no nix store" >&2
	exit 1
fi

ALSA=$(ls -d /nix/store/*alsa-lib-*/lib 2>/dev/null | sort | tail -1)
STDCXX=$(find /nix/store -maxdepth 3 -path "*gcc-*lib/lib/libstdc++.so.6" 2>/dev/null | head -1 | xargs dirname)
if [ -z "$ALSA" ] || [ -z "$STDCXX" ]; then
	echo "ERRO: não encontrei alsa-lib ou libstdc++ no store" >&2
	exit 1
fi

NM="$HOME/.pi/agent/npm/node_modules"

patch() {
	if [ -f "$2" ]; then
		"$PATCH" --add-rpath "$1" "$2" && echo "ok: $2"
	else
		echo "skip (não existe): $2"
	fi
}

echo "== decibri (alsa-lib) =="
patch "$ALSA" "$NM/@decibri/decibri-linux-x64-gnu/decibri.linux-x64-gnu.node"

echo "== sherpa-onnx (libstdc++) =="
patch "$STDCXX" "$NM/sherpa-onnx-linux-x64/sherpa-onnx.node"
patch "$STDCXX" "$NM/sherpa-onnx-linux-x64/libsherpa-onnx-c-api.so"
patch "$STDCXX" "$NM/sherpa-onnx-linux-x64/libsherpa-onnx-cxx-api.so"
patch "$STDCXX" "$NM/sherpa-onnx-linux-x64/libonnxruntime.so"

echo
echo "Verificando dependências pendentes:"
MISSING=0
for f in "$NM/@decibri/decibri-linux-x64-gnu/decibri.linux-x64-gnu.node" \
	"$NM/sherpa-onnx-linux-x64/sherpa-onnx.node"; do
	if [ -f "$f" ]; then
		if ldd "$f" 2>/dev/null | grep -q "not found"; then
			echo "PENDENTE em $f:"
			ldd "$f" | grep "not found"
			MISSING=1
		fi
	fi
done
[ "$MISSING" = "0" ] && echo "tudo resolvido"
