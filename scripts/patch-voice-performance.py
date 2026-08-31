#!/usr/bin/env python3
"""Optimize rpiv-voice 2.8.0 for larger local Whisper models."""

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
ENGINE_MARKER = "konan-pi-config: cache the recognizer"
PIPELINE_MARKER = "konan-pi-config: configurable partial decoding"
COMMIT_MARKER = "konan-pi-config: await the authoritative final decode"
SHUTDOWN_MARKER = "konan-pi-config: handle close-only microphone shutdown"


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
            f"ERROR: performance patch supports rpiv-voice {SUPPORTED_VERSION}, found {version}; review upstream first",
            file=sys.stderr,
        )
        return 1

    engine_path = PACKAGE_ROOT / "audio" / "stt-engine.ts"
    pipeline_path = PACKAGE_ROOT / "command" / "pipeline-runner.ts"
    command_path = PACKAGE_ROOT / "command" / "voice-command.ts"
    engine = engine_path.read_text()
    pipeline = pipeline_path.read_text()
    command = command_path.read_text()

    engine_patched = ENGINE_MARKER in engine
    pipeline_patched = PIPELINE_MARKER in pipeline
    commit_patched = COMMIT_MARKER in command
    shutdown_patched = SHUTDOWN_MARKER in pipeline
    if engine_patched and pipeline_patched and commit_patched and shutdown_patched:
        print(f"voice performance patch already applied to rpiv-voice {version}")
        return 0

    if not engine_patched:
        engine = replace_exact(
            engine,
            "export async function createSttEngine(config: SttEngineConfig): Promise<SttEngine> {\n\tconst ns = await loadSherpaNamespace();\n\tconst recognizer = new ns.OfflineRecognizer(buildRecognizerConfig(config));\n\n\treturn {\n\t\tasync recognize(samples: Float32Array, sampleRate: number): Promise<string> {\n\t\t\tif (samples.length === 0) return \"\";\n\t\t\tconst stream = recognizer.createStream();\n\t\t\tstream.acceptWaveform({ samples, sampleRate });\n\t\t\trecognizer.decode(stream);\n\t\t\treturn recognizer.getResult(stream).text.trim();\n\t\t},\n\t\trelease(): void {\n\t\t\t// sherpa-onnx-node@1.13.0 exposes no destructor; the native handle is\n\t\t\t// GC-managed. Kept as a no-op so the lifecycle contract is stable for\n\t\t\t// callers and tests.\n\t\t},\n\t};\n}\n",
            "// konan-pi-config: cache the recognizer for repeated /voice invocations.\nlet cachedEngine: { key: string; engine: SttEngine } | undefined;\n\nfunction engineCacheKey(config: SttEngineConfig): string {\n\treturn JSON.stringify([\n\t\tconfig.encoderPath,\n\t\tconfig.decoderPath,\n\t\tconfig.tokensPath,\n\t\tconfig.language ?? \"\",\n\t\tconfig.numThreads ?? DEFAULT_NUM_THREADS,\n\t\tconfig.provider ?? DEFAULT_PROVIDER,\n\t]);\n}\n\nexport async function createSttEngine(config: SttEngineConfig): Promise<SttEngine> {\n\tconst key = engineCacheKey(config);\n\tif (cachedEngine?.key === key) return cachedEngine.engine;\n\n\tconst ns = await loadSherpaNamespace();\n\tconst recognizer = new ns.OfflineRecognizer(buildRecognizerConfig(config));\n\tconst engine: SttEngine = {\n\t\tasync recognize(samples: Float32Array, sampleRate: number): Promise<string> {\n\t\t\tif (samples.length === 0) return \"\";\n\t\t\tconst stream = recognizer.createStream();\n\t\t\tstream.acceptWaveform({ samples, sampleRate });\n\t\t\trecognizer.decode(stream);\n\t\t\treturn recognizer.getResult(stream).text.trim();\n\t\t},\n\t\trelease(): void {\n\t\t\t// Cached for the lifetime of this Pi process. sherpa-onnx-node@1.13.0\n\t\t\t// exposes no explicit destructor; a different cache key lets GC reclaim it.\n\t\t},\n\t};\n\tcachedEngine = { key, engine };\n\treturn engine;\n}\n",
            "recognizer cache",
        )

    if not pipeline_patched:
        pipeline = replace_exact(
            pipeline,
            "export interface PipelineOptions {\n\thallucinationFilterEnabled?: boolean;\n}\n",
            "export interface PipelineOptions {\n\thallucinationFilterEnabled?: boolean;\n\t/** Set to 0 to disable expensive rolling re-decodes. */\n\tpartialDecodeIntervalMs?: number;\n}\n",
            "pipeline options",
        )
        pipeline = replace_exact(
            pipeline,
            "\tlet hallucinationFilterEnabled = isHallucinationFilterEnabled(options);\n\n\t// Single-flight gate for partial decodes.",
            "\tlet hallucinationFilterEnabled = isHallucinationFilterEnabled(options);\n\t// konan-pi-config: configurable partial decoding for larger models.\n\tconst partialDecodeIntervalMs = options.partialDecodeIntervalMs ?? PARTIAL_DECODE_INTERVAL_MS;\n\n\t// Single-flight gate for partial decodes.",
            "partial interval initialization",
        )
        pipeline = replace_exact(
            pipeline,
            "\tconst tryEmitPartial = (): void => {\n\t\tif (partialInFlight) return;",
            "\tconst tryEmitPartial = (): void => {\n\t\tif (partialDecodeIntervalMs <= 0) return;\n\t\tif (partialInFlight) return;",
            "partial disable gate",
        )
        pipeline = replace_exact(
            pipeline,
            "\t\tif (now - lastPartialAt < PARTIAL_DECODE_INTERVAL_MS) return;",
            "\t\tif (now - lastPartialAt < partialDecodeIntervalMs) return;",
            "partial interval use",
        )

    if not commit_patched:
        command = replace_exact(
            command,
            'import { isHallucinationFilterEnabled, loadVoiceConfig } from "../config/voice-config.js";\n',
            'import { getWhisperModelType, isHallucinationFilterEnabled, loadVoiceConfig } from "../config/voice-config.js";\n',
            "model type import",
        )
        command = replace_exact(
            command,
            "\t\t| {\n\t\t\t\tsetPaused: (v: boolean) => void;",
            "\t\t| {\n\t\t\t\tfinalTranscriptPromise: Promise<string>;\n\t\t\t\tsetPaused: (v: boolean) => void;",
            "pipeline final promise type",
        )
        command = replace_exact(
            command,
            "\t\tpipelineHandle = startDictationPipeline(mic, sttEngine, session, controller.signal, {\n\t\t\thallucinationFilterEnabled: isHallucinationFilterEnabled(persistedConfig),\n\t\t});",
            "\t\tpipelineHandle = startDictationPipeline(mic, sttEngine, session, controller.signal, {\n\t\t\thallucinationFilterEnabled: isHallucinationFilterEnabled(persistedConfig),\n\t\t\t// The small model is accurate but too expensive to re-run over the full\n\t\t\t// active utterance every second. Silence/Enter still trigger a final decode.\n\t\t\tpartialDecodeIntervalMs: getWhisperModelType(persistedConfig) === \"small\" ? 0 : undefined,\n\t\t});",
            "small model pipeline options",
        )
        command = replace_exact(
            command,
            "\tif (pulseTick) clearInterval(pulseTick);\n\tif (!controller.signal.aborted) controller.abort();\n\tsttEngine.release();\n\treturn result;\n}",
            "\tif (pulseTick) clearInterval(pulseTick);\n\tif (!controller.signal.aborted) controller.abort();\n\n\t// konan-pi-config: await the authoritative final decode after stopping the\n\t// microphone. This makes Enter safe even when rolling partials are disabled.\n\tlet finalizedTranscript = \"\";\n\tif (pipelineHandle) {\n\t\ttry {\n\t\t\tfinalizedTranscript = await pipelineHandle.finalTranscriptPromise;\n\t\t} catch {\n\t\t\t// Per-segment recognition errors are already logged by the pipeline.\n\t\t}\n\t}\n\tif (result.intent === \"commit\" && finalizedTranscript) {\n\t\treturn { ...result, transcript: finalizedTranscript };\n\t}\n\treturn result;\n}",
            "authoritative final transcript",
        )

    if not shutdown_patched:
        pipeline = replace_exact(
            pipeline,
            "function waitForMicShutdown(mic: DecibriLike, signal: AbortSignal, onFinish: () => Promise<void>): Promise<void> {\n\treturn new Promise<void>((resolve) => {\n\t\tconst onAbort = () => {\n\t\t\tmic.stop();\n\t\t};\n\t\tconst finish = async () => {\n\t\t\tsignal.removeEventListener(\"abort\", onAbort);\n\t\t\tawait onFinish();\n\t\t\tresolve();\n\t\t};\n\t\tmic.once(\"end\", finish);\n\t\tmic.once(\"error\", finish);\n\t\tif (signal.aborted) {\n\t\t\tmic.stop();\n\t\t} else {\n\t\t\tsignal.addEventListener(\"abort\", onAbort, { once: true });\n\t\t}\n\t});\n}\n",
            "function waitForMicShutdown(mic: DecibriLike, signal: AbortSignal, onFinish: () => Promise<void>): Promise<void> {\n\treturn new Promise<void>((resolve) => {\n\t\tlet finished = false;\n\t\tconst onAbort = () => {\n\t\t\tmic.stop();\n\t\t};\n\t\t// konan-pi-config: handle close-only microphone shutdown. decibri may\n\t\t// emit close rather than end when stop() is called from the Enter path.\n\t\tconst finish = async () => {\n\t\t\tif (finished) return;\n\t\t\tfinished = true;\n\t\t\tsignal.removeEventListener(\"abort\", onAbort);\n\t\t\tawait onFinish();\n\t\t\tresolve();\n\t\t};\n\t\tmic.once(\"end\", finish);\n\t\tmic.once(\"error\", finish);\n\t\tmic.once(\"close\", finish);\n\t\tif (signal.aborted) {\n\t\t\tmic.stop();\n\t\t} else {\n\t\t\tsignal.addEventListener(\"abort\", onAbort, { once: true });\n\t\t}\n\t});\n}\n",
            "close-only microphone shutdown",
        )

    engine_path.write_text(engine)
    pipeline_path.write_text(pipeline)
    command_path.write_text(command)
    print(f"applied voice performance patch to rpiv-voice {version}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
