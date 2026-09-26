import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const WORKING_PHRASES = [
	"Forging code…",
	"Connecting the dots…",
	"Shaping the answer…",
	"Following the thread…",
	"Working through it…",
	"Almost there…",
] as const;

const PHRASE_INTERVAL_MS = 4_800;

export default function (pi: ExtensionAPI): void {
	let activeContext: ExtensionContext | undefined;
	let phraseTimer: ReturnType<typeof setInterval> | undefined;

	function stopPhrases(): void {
		if (phraseTimer) clearInterval(phraseTimer);
		phraseTimer = undefined;
	}

	function startPhrases(): void {
		stopPhrases();
		if (!activeContext) return;

		let phraseIndex = Math.floor(Math.random() * WORKING_PHRASES.length);
		activeContext.ui.setWorkingMessage(WORKING_PHRASES[phraseIndex]);
		phraseTimer = setInterval(() => {
			phraseIndex = (phraseIndex + 1) % WORKING_PHRASES.length;
			activeContext?.ui.setWorkingMessage(WORKING_PHRASES[phraseIndex]);
		}, PHRASE_INTERVAL_MS);
		phraseTimer.unref();
	}

	pi.on("session_start", (_event, ctx) => {
		activeContext = ctx;
		ctx.ui.setWorkingIndicator();
		ctx.ui.setWorkingMessage();
	});

	pi.on("agent_start", startPhrases);
	pi.on("agent_end", stopPhrases);
	pi.on("agent_settled", stopPhrases);

	pi.on("session_shutdown", () => {
		stopPhrases();
		activeContext = undefined;
	});
}
