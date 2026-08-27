/**
 * Paste Highlight Extension
 *
 * Gives pasted-text markers in the input editor (`[paste #1 +123 lines]`)
 * a colored background so they stand out while typing.
 *
 * Colors: catppuccin-mocha friendly (surface1 bg + mauve fg).
 * Edit PASTE_BG / PASTE_FG below to customize.
 */

import { CustomEditor, type ExtensionAPI } from "@earendil-works/pi-coding-agent";

const PASTE_BG = { r: 249, g: 226, b: 175 }; // catppuccin yellow #f9e2af
const PASTE_FG = { r: 24, g: 24, b: 37 }; // catppuccin crust #181825 (dark)

const PASTE_MARKER_RENDER_REGEX = /\[paste #\d+(?: \+\d+ lines|\d+ chars)?\]/g;

class PasteHighlightEditor extends CustomEditor {
	render(width: number): string[] {
		const lines = super.render(width);
		return lines.map((line) =>
			line.replace(PASTE_MARKER_RENDER_REGEX, (marker) =>
				`\x1b[48;2;${PASTE_BG.r};${PASTE_BG.g};${PASTE_BG.b}m` +
				`\x1b[38;2;${PASTE_FG.r};${PASTE_FG.g};${PASTE_FG.b}m` +
				`\x1b[1m` +
				`${marker}` +
				`\x1b[0m`
			)
		);
	}
}

export default function (pi: ExtensionAPI) {
	pi.on("session_start", async (_event, ctx) => {
		if (ctx.mode === "tui") {
			ctx.ui.setEditorComponent(
				(tui, theme, kb) => new PasteHighlightEditor(tui, theme, kb)
			);
		}
	});
}
