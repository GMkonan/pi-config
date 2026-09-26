import path from "node:path";
import {
	VERSION,
	keyHint,
	type ExtensionAPI,
	type ExtensionContext,
	type Theme,
} from "@earendil-works/pi-coding-agent";
import { truncateToWidth } from "@earendil-works/pi-tui";

const THINKING_COLORS: Record<
	string,
	| "thinkingOff"
	| "thinkingMinimal"
	| "thinkingLow"
	| "thinkingMedium"
	| "thinkingHigh"
	| "thinkingXhigh"
	| "thinkingMax"
> = {
	off: "thinkingOff",
	minimal: "thinkingMinimal",
	low: "thinkingLow",
	medium: "thinkingMedium",
	high: "thinkingHigh",
	xhigh: "thinkingXhigh",
	max: "thinkingMax",
};

export default function (pi: ExtensionAPI): void {
	let enabled = true;
	let tuiRef: { requestRender(): void } | undefined;

	function sessionLabel(ctx: ExtensionContext): string {
		return pi.getSessionName() || path.basename(ctx.cwd) || "new session";
	}

	function apply(ctx: ExtensionContext): void {
		if (ctx.mode !== "tui") return;
		if (!enabled) {
			ctx.ui.setHeader(undefined);
			tuiRef = undefined;
			return;
		}

		ctx.ui.setHeader((tui, theme: Theme) => {
			tuiRef = tui;
			return {
				render(width: number): string[] {
					const commands = pi.getCommands();
					const skillCount = commands.filter((command) => command.source === "skill").length;
					const promptCount = commands.filter((command) => command.source === "prompt").length;
					const toolCount = pi.getActiveTools().length;
					const model = ctx.model
						? `${ctx.model.provider}/${ctx.model.id}`
						: "no model";
					const thinkingLevel = pi.getThinkingLevel();

					const title = [
						theme.fg("accent", theme.bold("π Pi")),
						theme.fg("dim", `v${VERSION}`),
						theme.fg("text", sessionLabel(ctx)),
					].join(theme.fg("dim", " • "));

					const resources = [
						theme.fg("accent", model),
						theme.fg(THINKING_COLORS[thinkingLevel] ?? "thinkingOff", thinkingLevel),
						theme.fg("muted", `${toolCount} tools`),
						theme.fg("muted", `${skillCount} skills`),
						theme.fg("muted", `${promptCount} prompts`),
					].join(theme.fg("dim", " • "));

					const hints = theme.fg(
						"dim",
						`${keyHint("app.model.select", "model")} • ${keyHint("app.thinking.cycle", "thinking")} • /hotkeys`,
					);

					return [
						truncateToWidth(title, width, ""),
						truncateToWidth(resources, width, ""),
						truncateToWidth(hints, width, ""),
						"",
					];
				},
				invalidate() {},
			};
		});
	}

	pi.on("session_start", (_event, ctx) => apply(ctx));
	pi.on("session_info_changed", (_event, ctx) => {
		apply(ctx);
		tuiRef?.requestRender();
	});
	pi.on("model_select", (_event, ctx) => {
		apply(ctx);
		tuiRef?.requestRender();
	});
	pi.on("thinking_level_select", (_event, ctx) => {
		apply(ctx);
		tuiRef?.requestRender();
	});
	pi.on("resources_discover", () => {
		tuiRef?.requestRender();
	});

	pi.registerCommand("header", {
		description: "Toggle the compact Pi header",
		handler: async (_args, ctx) => {
			enabled = !enabled;
			apply(ctx);
			ctx.ui.notify(enabled ? "Compact header enabled" : "Built-in header restored", "info");
		},
	});
}
