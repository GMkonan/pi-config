/**
 * Custom Header Extension
 *
 * Replaces the built-in header (logo + keybinding hints) with a compact
 * banner showing a stylized "π" logo, session info and model.
 * Toggle with /header.
 *
 * Based on the pi example custom-header.ts.
 */

import type { ExtensionAPI, Theme } from "@earendil-works/pi-coding-agent";
import { VERSION } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

function getBanner(theme: Theme): string[] {
	// Compact pi banner (3 lines)
	const accent = (text: string) => theme.fg("accent", text);
	const muted = (text: string) => theme.fg("muted", text);

	const line1 = `  ${accent("╭─╮")}`;
	const line2 = `  ${accent("│ │")} ${muted("coding agent")}`;
	const line3 = `  ${accent("╰─╯")}`;

	return [line1, line2, line3];
}

export default function (pi: ExtensionAPI) {
	let enabled = true;

	const apply = (ctx: any) => {
		if (ctx.mode !== "tui") return;

		if (!enabled) {
			ctx.ui.setHeader(undefined);
			return;
		}

		ctx.ui.setHeader((tui: any, theme: Theme) => {
			return {
				render(width: number): string[] {
					// Compute info as plain strings first (no ANSI codes) for width math
					const plainInfo: string[] = [];
					plainInfo.push(`v${VERSION}`);
					if (ctx.model) {
						plainInfo.push(`${ctx.model.provider}/${ctx.model.id}`);
					}
					if (ctx.thinkingLevel) {
						plainInfo.push(`⚡ ${ctx.thinkingLevel}`);
					}
					const sessionFile = ctx.sessionManager.getSessionFile();
					if (sessionFile) {
						const name = sessionFile.split("/").pop()?.replace(/\.jsonl$/, "") ?? "";
						if (name) plainInfo.push(name.slice(-20));
					}

					const separator = "  ·  ";
					const plainInfoLine = plainInfo.join(separator);
					// Colorize: first item dim, rest muted, separators dim
					let infoLine = "";
					plainInfo.forEach((item, i) => {
						if (i > 0) infoLine += theme.fg("dim", separator);
						infoLine += theme.fg(i === 0 ? "dim" : "muted", item);
					});

					// Banner (plain widths: line1 = "  ╭─╮" = 5 visible chars)
					const bannerVisibleWidth = 5;
					const banner = getBanner(theme);
					const lines = [...banner];
					const pad = " ".repeat(
						Math.max(1, width - bannerVisibleWidth - visibleWidth(plainInfoLine))
					);
					lines[0] = truncateToWidth(lines[0] + pad + infoLine, width);
					return [...lines, ""];
				},
				invalidate() {},
			};
		});
	};

	pi.on("session_start", async (_event, ctx) => apply(ctx));

	pi.on("model_select", async (_event, ctx) => {
		// Re-apply to refresh model name in header
		apply(ctx);
	});

	pi.registerCommand("header", {
		description: "Toggle custom header (banner + model info)",
		handler: async (_args, ctx) => {
			enabled = !enabled;
			apply(ctx);
			ctx.ui.notify(
				enabled ? "Custom header enabled" : "Built-in header restored",
				"info"
			);
		},
	});
}
