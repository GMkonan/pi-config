/**
 * Paste and image marker highlighting for Pi's input editor.
 *
 * - Styles Pi's native large-paste markers.
 * - Replaces Pi-generated clipboard image paths with compact `[image N]`
 *   markers while editing, then restores the exact paths at input submission.
 */

import { CustomEditor, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { ImageMarkerRegistry, isPiClipboardImagePath } from "./paste-highlight-core.js";

const MARKER_FG = { r: 24, g: 24, b: 37 }; // catppuccin crust #181825
const PASTE_BG = { r: 249, g: 226, b: 175 }; // catppuccin yellow #f9e2af
const IMAGE_BG = { r: 137, g: 180, b: 250 }; // catppuccin blue #89b4fa

const PASTE_MARKER_RENDER_REGEX = /\[paste #\d+(?: \+\d+ lines| \d+ chars)?\]/g;
const IMAGE_MARKER_RENDER_REGEX = /\[image \d+\]/g;
function styleMarker(marker: string, background: { r: number; g: number; b: number }): string {
	return (
		`\x1b[48;2;${background.r};${background.g};${background.b}m` +
		`\x1b[38;2;${MARKER_FG.r};${MARKER_FG.g};${MARKER_FG.b}m` +
		`\x1b[1m${marker}\x1b[0m`
	);
}

class PasteHighlightEditor extends CustomEditor {
	constructor(
		tui: ConstructorParameters<typeof CustomEditor>[0],
		theme: ConstructorParameters<typeof CustomEditor>[1],
		keybindings: ConstructorParameters<typeof CustomEditor>[2],
		private readonly imageMarkers: ImageMarkerRegistry,
	) {
		super(tui, theme, keybindings);
	}

	override insertTextAtCursor(text: string): void {
		if (isPiClipboardImagePath(text)) {
			super.insertTextAtCursor(this.imageMarkers.register(text));
			return;
		}
		super.insertTextAtCursor(text);
	}

	override render(width: number): string[] {
		return super.render(width).map((line) =>
			line
				.replace(PASTE_MARKER_RENDER_REGEX, (marker) => styleMarker(marker, PASTE_BG))
				.replace(IMAGE_MARKER_RENDER_REGEX, (marker) => styleMarker(marker, IMAGE_BG)),
		);
	}
}

export default function (pi: ExtensionAPI): void {
	const imageMarkers = new ImageMarkerRegistry();

	pi.on("session_start", async (_event, ctx) => {
		imageMarkers.clear();
		if (ctx.mode !== "tui") return;
		ctx.ui.setEditorComponent((tui, theme, keybindings) => {
			return new PasteHighlightEditor(tui, theme, keybindings, imageMarkers);
		});
	});

	pi.on("input", async (event) => {
		if (event.source !== "interactive") return { action: "continue" };
		const restored = imageMarkers.restoreSubmittedMarkers(event.text);
		if (!restored.changed) return { action: "continue" };
		return { action: "transform", text: restored.text, images: event.images };
	});
}
