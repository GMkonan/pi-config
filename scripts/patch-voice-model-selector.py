#!/usr/bin/env python3
"""Add a guarded base/small Whisper selector to rpiv-voice 2.8.0.

The upstream package currently hardcodes Whisper base. This patch is deliberately
version-guarded: a future package update must be reviewed instead of receiving a
possibly incompatible source rewrite.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
import sys

PACKAGE_ROOT = (
    Path(os.environ.get("PI_CODING_AGENT_DIR", Path.home() / ".pi" / "agent"))
    / "npm"
    / "node_modules"
    / "@juicesharp"
    / "rpiv-voice"
)
SUPPORTED_VERSION = "2.8.0"
MODEL_MARKER = "konan-pi-config: configurable base/small model"
SETTINGS_MARKER = "konan-pi-config: preserve model selection"


def replace_exact(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one source match, found {count}")
    return source.replace(old, new)


def main() -> int:
    package_json = PACKAGE_ROOT / "package.json"
    if not package_json.is_file():
        print(f"ERROR: rpiv-voice not found at {PACKAGE_ROOT}", file=sys.stderr)
        return 1

    version = json.loads(package_json.read_text())["version"]
    if version != SUPPORTED_VERSION:
        print(
            f"ERROR: selector patch supports rpiv-voice {SUPPORTED_VERSION}, found {version}; review the upstream changes first",
            file=sys.stderr,
        )
        return 1

    config_path = PACKAGE_ROOT / "config" / "voice-config.ts"
    model_path = PACKAGE_ROOT / "audio" / "model-download.ts"
    reducer_path = PACKAGE_ROOT / "state" / "state-reducer.ts"
    config_source = config_path.read_text()
    model_source = model_path.read_text()
    reducer_source = reducer_path.read_text()

    model_patched = MODEL_MARKER in model_source
    settings_patched = SETTINGS_MARKER in reducer_source
    if model_patched and "export type WhisperModelType" not in config_source:
        raise RuntimeError("model selector marker exists but VoiceConfig is not patched")
    if model_patched and settings_patched:
        print(f"voice model selector already applied to rpiv-voice {version}")
        return 0

    if not model_patched:
        config_source = replace_exact(
            config_source,
            "export interface VoiceConfig {\n\treadonly hallucinationFilterEnabled?: boolean;\n\treadonly equalizerEnabled?: boolean;\n}\n",
            "export type WhisperModelType = \"base\" | \"small\";\n\nexport interface VoiceConfig {\n\treadonly hallucinationFilterEnabled?: boolean;\n\treadonly equalizerEnabled?: boolean;\n\treadonly whisperModelType?: WhisperModelType;\n}\n\n/** Accept only model variants verified against sherpa-onnx release assets. */\nexport function getWhisperModelType(config: VoiceConfig): WhisperModelType {\n\treturn config.whisperModelType === \"small\" ? \"small\" : \"base\";\n}\n",
            "voice config type",
        )
        model_source = replace_exact(
            model_source,
            'import { t } from "../state/i18n-bridge.js";\n',
            'import { getWhisperModelType, loadVoiceConfig } from "../config/voice-config.js";\nimport { t } from "../state/i18n-bridge.js";\n',
            "model config import",
        )
        model_source = replace_exact(
            model_source,
            'const MODEL_DIR_NAME = "whisper-base";\nexport const MODELS_DIR = join(homedir(), ".pi", "models");\nexport const WHISPER_BASE_DIR = join(MODELS_DIR, MODEL_DIR_NAME);\nexport const SENTINEL_FILE = ".download-complete";\n',
            '// konan-pi-config: configurable base/small model\nconst WHISPER_MODEL_TYPE = getWhisperModelType(loadVoiceConfig());\nconst MODEL_DIR_NAME = `whisper-${WHISPER_MODEL_TYPE}`;\nexport const MODELS_DIR = join(homedir(), ".pi", "models");\n// Kept under the historical export name for compatibility with upstream tests.\nexport const WHISPER_BASE_DIR = join(MODELS_DIR, MODEL_DIR_NAME);\nexport const SENTINEL_FILE = ".download-complete";\n',
            "model directory",
        )
        model_source = replace_exact(
            model_source,
            'const MODEL_ARCHIVE_NAME = "sherpa-onnx-whisper-base.tar.bz2";\n',
            'const MODEL_ARCHIVE_NAME = `sherpa-onnx-whisper-${WHISPER_MODEL_TYPE}.tar.bz2`;\n',
            "archive name",
        )
        model_source = replace_exact(
            model_source,
            'const ENCODER_FILE = "base-encoder.int8.onnx";\nconst DECODER_FILE = "base-decoder.int8.onnx";\nconst TOKENS_FILE = "base-tokens.txt";\n',
            'const ENCODER_FILE = `${WHISPER_MODEL_TYPE}-encoder.int8.onnx`;\nconst DECODER_FILE = `${WHISPER_MODEL_TYPE}-decoder.int8.onnx`;\nconst TOKENS_FILE = `${WHISPER_MODEL_TYPE}-tokens.txt`;\n',
            "int8 model files",
        )
        model_source = replace_exact(
            model_source,
            'const FP32_ENCODER_FILE = "base-encoder.onnx";\nconst FP32_DECODER_FILE = "base-decoder.onnx";\n',
            'const FP32_ENCODER_FILE = `${WHISPER_MODEL_TYPE}-encoder.onnx`;\nconst FP32_DECODER_FILE = `${WHISPER_MODEL_TYPE}-decoder.onnx`;\n',
            "fp32 model files",
        )
        model_source = replace_exact(
            model_source,
            'const msgDownloading = (): string => t("splash.downloading", "Downloading Whisper…");\n',
            'const msgDownloading = (): string =>\n\tt("splash.downloading", `Downloading Whisper ${WHISPER_MODEL_TYPE}…`);\n',
            "download status",
        )

    if not settings_patched:
        reducer_source = replace_exact(
            reducer_source,
            'const closeSettings: Handler<"close_settings"> = (state, _action, _ctx) => ({\n\tstate: { ...state, currentScreen: "dictation" },\n\teffects: [{ kind: "save_config", config: configFromDraft(state.settingsDraft) }, { kind: "request_render" }],\n});\n',
            'const closeSettings: Handler<"close_settings"> = (state, _action, ctx) => ({\n\tstate: { ...state, currentScreen: "dictation" },\n\teffects: [\n\t\t{ kind: "save_config", config: configFromDraft(state.settingsDraft, ctx.persistedConfig) },\n\t\t{ kind: "request_render" },\n\t],\n});\n',
            "close settings persistence",
        )
        reducer_source = replace_exact(
            reducer_source,
            'const settingsSave: Handler<"settings_save"> = (state, _action, _ctx) => {\n\tconst config = configFromDraft(state.settingsDraft);\n',
            'const settingsSave: Handler<"settings_save"> = (state, _action, ctx) => {\n\tconst config = configFromDraft(state.settingsDraft, ctx.persistedConfig);\n',
            "explicit settings persistence",
        )
        reducer_source = replace_exact(
            reducer_source,
            'export function configFromDraft(draft: SettingsDraft): VoiceConfig {\n\tconst out: { -readonly [K in keyof VoiceConfig]: VoiceConfig[K] } = {};\n\t// Only persist the non-default state.',
            'export function configFromDraft(draft: SettingsDraft, persistedConfig: VoiceConfig = {}): VoiceConfig {\n\t// konan-pi-config: preserve model selection when the upstream settings UI saves.\n\tconst out: { -readonly [K in keyof VoiceConfig]: VoiceConfig[K] } = { ...persistedConfig };\n\tdelete out.hallucinationFilterEnabled;\n\tdelete out.equalizerEnabled;\n\t// Only persist the non-default state.',
            "config model preservation",
        )

    config_path.write_text(config_source)
    model_path.write_text(model_source)
    reducer_path.write_text(reducer_source)
    print(f"applied base/small selector to rpiv-voice {version}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
