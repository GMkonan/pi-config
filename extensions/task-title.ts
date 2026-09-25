import path from "node:path";
import type {
	ExtensionAPI,
	ExtensionContext,
} from "@earendil-works/pi-coding-agent";

const MAX_TASK_LENGTH = 48;

function sanitizeTaskName(value: string): string {
	const withoutControlCharacters = Array.from(value, (character) => {
		const codePoint = character.codePointAt(0) ?? 0;
		return codePoint < 32 || codePoint === 127 ? " " : character;
	}).join("");
	const sanitized = withoutControlCharacters.replace(/\s+/g, " ").trim();

	if (sanitized.length <= MAX_TASK_LENGTH) return sanitized;
	return `${sanitized.slice(0, MAX_TASK_LENGTH - 1)}…`;
}

export default function (pi: ExtensionAPI) {
	let busy = false;
	let startupTimer: ReturnType<typeof setTimeout> | undefined;

	function updateTitle(ctx: ExtensionContext) {
		if (!ctx.hasUI) return;

		const sessionName = pi.getSessionName();
		const directoryName = path.basename(ctx.cwd) || ctx.cwd;
		const taskName = sanitizeTaskName(sessionName || directoryName) || "pi";
		const state = busy ? "●" : "○";

		ctx.ui.setTitle(`${state} ${taskName}`);
	}

	pi.on("session_start", (_event, ctx) => {
		updateTitle(ctx);

		// Pi applies its default title during startup, after session_start.
		// Reapply ours on the next event-loop tick so the task title wins.
		startupTimer = setTimeout(() => {
			startupTimer = undefined;
			updateTitle(ctx);
		}, 0);
	});

	pi.on("session_info_changed", (_event, ctx) => {
		updateTitle(ctx);
	});

	pi.on("agent_start", (_event, ctx) => {
		busy = true;
		updateTitle(ctx);
	});

	pi.on("agent_settled", (_event, ctx) => {
		busy = false;
		updateTitle(ctx);
	});

	pi.on("session_shutdown", () => {
		if (startupTimer) clearTimeout(startupTimer);
		startupTimer = undefined;
	});
}
