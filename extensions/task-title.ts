import path from "node:path";
import type {
	ExtensionAPI,
	ExtensionContext,
} from "@earendil-works/pi-coding-agent";

const MAX_TASK_LENGTH = 48;
type Activity = "idle" | "running" | "waiting";

function sanitizeTaskName(value: string): string {
	const withoutControlCharacters = Array.from(value, (character) => {
		const codePoint = character.codePointAt(0) ?? 0;
		return codePoint < 32 || codePoint === 127 ? " " : character;
	}).join("");
	const sanitized = withoutControlCharacters.replace(/\s+/g, " ").trim();
	const characters = Array.from(sanitized);

	if (characters.length <= MAX_TASK_LENGTH) return sanitized;
	return `${characters.slice(0, MAX_TASK_LENGTH - 1).join("")}…`;
}

export default function (pi: ExtensionAPI): void {
	let activity: Activity = "idle";
	let agentRunning = false;
	let startupTimer: ReturnType<typeof setTimeout> | undefined;

	function updateTitle(ctx: ExtensionContext): void {
		if (!ctx.hasUI) return;

		const sessionName = pi.getSessionName();
		const directoryName = path.basename(ctx.cwd) || ctx.cwd;
		const taskName = sanitizeTaskName(sessionName || directoryName) || "pi";
		const state = activity === "running" ? "●" : activity === "waiting" ? "?" : "○";

		ctx.ui.setTitle(`${state} ${taskName}`);
	}

	pi.on("session_start", (_event, ctx) => {
		agentRunning = false;
		activity = "idle";
		updateTitle(ctx);

		startupTimer = setTimeout(() => {
			startupTimer = undefined;
			updateTitle(ctx);
		}, 0);
	});

	pi.on("session_info_changed", (_event, ctx) => {
		updateTitle(ctx);
	});

	pi.on("agent_start", (_event, ctx) => {
		agentRunning = true;
		activity = "running";
		updateTitle(ctx);
	});

	pi.on("ui_prompt_start", (_event, ctx) => {
		activity = "waiting";
		updateTitle(ctx);
	});

	pi.on("ui_prompt_end", (_event, ctx) => {
		activity = agentRunning ? "running" : "idle";
		updateTitle(ctx);
	});

	pi.on("agent_settled", (_event, ctx) => {
		agentRunning = false;
		activity = "idle";
		updateTitle(ctx);
	});

	pi.on("session_shutdown", () => {
		if (startupTimer) clearTimeout(startupTimer);
		startupTimer = undefined;
		agentRunning = false;
		activity = "idle";
	});
}
