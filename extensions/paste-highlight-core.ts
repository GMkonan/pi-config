import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, resolve } from "node:path";

const PI_CLIPBOARD_IMAGE_BASENAME =
	/^pi-clipboard-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:png|jpe?g|gif|webp|bmp)$/i;

export function isPiClipboardImagePath(value: string): boolean {
	if (!value || value.includes("\n")) return false;
	if (!PI_CLIPBOARD_IMAGE_BASENAME.test(basename(value))) return false;
	if (resolve(dirname(value)) !== resolve(tmpdir())) return false;
	return existsSync(value);
}

export class ImageMarkerRegistry {
	private readonly paths = new Map<number, string>();
	private nextId = 1;

	register(imagePath: string): string {
		const id = this.nextId++;
		this.paths.set(id, imagePath);
		return `[image ${id}]`;
	}

	restoreSubmittedMarkers(text: string): { text: string; changed: boolean } {
		let restored = text;
		let changed = false;
		for (const [id, imagePath] of this.paths) {
			const marker = `[image ${id}]`;
			const markerIndex = restored.indexOf(marker);
			if (markerIndex === -1) continue;
			restored = restored.slice(0, markerIndex) + imagePath + restored.slice(markerIndex + marker.length);
			changed = true;
		}
		this.clear();
		return { text: restored, changed };
	}

	clear(): void {
		this.paths.clear();
		this.nextId = 1;
	}
}
