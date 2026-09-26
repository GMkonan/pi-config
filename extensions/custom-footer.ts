import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";

type ModelInfo = {
	id?: string;
	provider?: string;
	contextWindow?: number;
};

const THINKING_COLORS: Record<
	ThinkingLevel,
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

function formatContextWindow(value: number | undefined): string {
	if (!value) return "";
	if (value >= 1_000_000) {
		return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
	}
	if (value >= 1_000) {
		return `${(value / 1_000).toFixed(value % 1_000 === 0 ? 0 : 1)}K`;
	}
	return String(value);
}

function formatDirectory(value: string): string {
	const home = process.env.HOME || process.env.USERPROFILE;
	const insideHome = home && (value === home || value.startsWith(`${home}/`));
	const path = insideHome ? `~${value.slice(home.length)}` : value;
	const parts = path.split("/").filter(Boolean);
	if (visibleWidth(path) <= 42 || parts.length < 3) return truncateToWidth(path, 42);

	const first = path.startsWith("~/") ? `~/${parts[1]}` : path.startsWith("/") ? `/${parts[0]}` : parts[0];
	const shortened = `${first}/…/${parts.at(-1)}`;
	return truncateToWidth(shortened, 42);
}

function align(left: string, right: string, width: number): string {
	if (width <= 0) return "";
	const rightWidth = visibleWidth(right);
	if (rightWidth >= width) return truncateToWidth(right, width, "");

	const leftWidth = visibleWidth(left);
	if (leftWidth + rightWidth + 1 <= width) {
		return left + " ".repeat(width - leftWidth - rightWidth) + right;
	}

	const availableLeft = Math.max(0, width - rightWidth - 1);
	const clippedLeft = truncateToWidth(left, availableLeft, "");
	return clippedLeft + " ".repeat(Math.max(1, width - visibleWidth(clippedLeft) - rightWidth)) + right;
}

export default function (pi: ExtensionAPI): void {
	let tuiRef: { requestRender(): void } | undefined;
	let active = false;
	let generation = 0;
	let currentCwd = process.cwd();
	let currentModel: ModelInfo | undefined;
	let thinkingLevel: ThinkingLevel = "off";
	let dirty = false;
	let refreshRunning = false;
	let refreshQueued = false;

	function requestRender(): void {
		tuiRef?.requestRender();
	}

	function scheduleDirtyRefresh(): void {
		if (!active) return;
		if (refreshRunning) {
			refreshQueued = true;
			return;
		}

		const runGeneration = generation;
		const cwd = currentCwd;
		refreshRunning = true;
		void pi
			.exec("git", ["status", "--porcelain", "--untracked-files=normal"], {
				cwd,
				timeout: 5000,
			})
			.then((result) => {
				if (!active || generation !== runGeneration || currentCwd !== cwd) return;
				const nextDirty = result.code === 0 && result.stdout.trim().length > 0;
				if (nextDirty !== dirty) {
					dirty = nextDirty;
					requestRender();
				}
			})
			.catch(() => undefined)
			.finally(() => {
				if (generation !== runGeneration) return;
				refreshRunning = false;
				if (refreshQueued) {
					refreshQueued = false;
					scheduleDirtyRefresh();
				}
			});
	}

	pi.on("model_select", (event) => {
		currentModel = event.model as ModelInfo;
		requestRender();
	});

	pi.on("thinking_level_select", (event) => {
		thinkingLevel = event.level as ThinkingLevel;
		requestRender();
	});

	pi.on("tool_execution_end", (event) => {
		if (event.toolName === "edit" || event.toolName === "write" || event.toolName === "bash") {
			scheduleDirtyRefresh();
		}
	});

	pi.on("turn_end", () => {
		scheduleDirtyRefresh();
	});

	pi.on("session_start", (_event, ctx) => {
		active = true;
		generation += 1;
		currentCwd = ctx.cwd;
		currentModel = ctx.model as ModelInfo | undefined;
		thinkingLevel = pi.getThinkingLevel() as ThinkingLevel;
		dirty = false;
		refreshRunning = false;
		refreshQueued = false;
		scheduleDirtyRefresh();

		ctx.ui.setFooter((tui, theme, footerData) => {
			tuiRef = tui;
			const unsubscribe = footerData.onBranchChange(() => {
				scheduleDirtyRefresh();
				tui.requestRender();
			});

			return {
				dispose() {
					unsubscribe();
					if (tuiRef === tui) tuiRef = undefined;
				},
				invalidate() {
					scheduleDirtyRefresh();
				},
				render(width: number): string[] {
					const cwd = formatDirectory(ctx.cwd);
					const slash = cwd.lastIndexOf("/");
					const prefix = slash >= 0 ? cwd.slice(0, slash + 1) : "";
					const project = slash >= 0 ? cwd.slice(slash + 1) : cwd;
					const pathText =
						theme.fg("dim", prefix) + theme.fg("accent", theme.bold(project || cwd));

					const branch = footerData.getGitBranch();
					const branchText = branch
						? theme.fg(dirty ? "warning" : "success", `git:${branch}${dirty ? "*" : ""}`)
						: "";

					const model = currentModel ?? (ctx.model as ModelInfo | undefined);
					const modelName = model?.id ?? "no-model";
					const provider = model?.provider;
					const modelText = provider
						? `${theme.fg("muted", provider)}${theme.fg("dim", "/")}${theme.fg("accent", modelName)}`
						: theme.fg("accent", modelName);
					const thinkingText = theme.fg(THINKING_COLORS[thinkingLevel], `(${thinkingLevel})`);

					const primary = [pathText, branchText, `${modelText} ${thinkingText}`]
						.filter(Boolean)
						.join(theme.fg("dim", " • "));

					const statuses = [...footerData.getExtensionStatuses().values()].filter(
						(status) => status.trim().length > 0,
					);
					const statusText = statuses.join(theme.fg("dim", " • "));

					const usage = ctx.getContextUsage();
					const percent = usage?.percent;
					const numericPercent = typeof percent === "number" ? Math.max(0, Math.min(100, percent)) : 0;
					const color =
						typeof percent !== "number" ? "dim" : numericPercent >= 80 ? "error" : numericPercent >= 60 ? "warning" : "success";
					const blocks = 10;
					const filled = Math.round((numericPercent / 100) * blocks);
					const bar = theme.fg(color, "#".repeat(filled)) + theme.fg("dim", ".".repeat(blocks - filled));
					const contextWindow = formatContextWindow(model?.contextWindow);
					const contextText = `${theme.fg(color, "[")}${bar}${theme.fg(color, "]")} ${theme.fg(color, typeof percent === "number" ? `${Math.round(percent)}%` : "?")}${
						contextWindow ? theme.fg("dim", ` (${contextWindow})`) : ""
					}`;

					const combinedLeft = statusText
						? `${primary}${theme.fg("dim", " • ")}${statusText}`
						: primary;
					if (visibleWidth(combinedLeft) + visibleWidth(contextText) + 1 <= width) {
						return [align(combinedLeft, contextText, width)];
					}

					return [
						truncateToWidth(primary, width, ""),
						align(statusText, contextText, width),
					];
				},
			};
		});
	});

	pi.on("session_shutdown", () => {
		active = false;
		generation += 1;
		refreshQueued = false;
		tuiRef = undefined;
	});
}
