import { MarkdownRenderChild } from "obsidian";
import type { App } from "obsidian";
import { getLabelColor, getProjectColor } from "../colors";
import { dailyNoteDateFromPath } from "../dailyNotes";
import { displayLabel } from "../labels";
import { getPriorityClass, getPriorityDisplayLabel, hasVisiblePriority } from "../priority";
import { normalizeTaskProject } from "../projects";
import { GraphiteSettings } from "../settings";
import { TaskStore } from "../taskStore";
import { GraphiteTask } from "../types";
import { renderLinkedText } from "./linkedText";

interface DailyNoteCompletedBlockOptions {
  containerEl: HTMLElement;
  source: string;
  sourcePath: string;
  app: App;
  store: TaskStore;
  settings: GraphiteSettings;
  openDailyNote: (date: string, sourcePath: string) => void;
}

const DATE_OPTION_RE = /(?:^|\n)\s*date\s*:\s*(\d{4}-\d{2}-\d{2})\s*(?:\n|$)/i;
const DATE_LINE_RE = /^\s*(\d{4}-\d{2}-\d{2})\s*$/m;

export class DailyNoteCompletedBlock extends MarkdownRenderChild {
  private readonly source: string;
  private readonly sourcePath: string;
  private readonly app: App;
  private readonly store: TaskStore;
  private readonly settings: GraphiteSettings;
  private readonly openDailyNote: (date: string, sourcePath: string) => void;
  private unsubscribe?: () => void;

  constructor(options: DailyNoteCompletedBlockOptions) {
    super(options.containerEl);
    this.source = options.source;
    this.sourcePath = options.sourcePath;
    this.app = options.app;
    this.store = options.store;
    this.settings = options.settings;
    this.openDailyNote = options.openDailyNote;
  }

  onload(): void {
    this.unsubscribe = this.store.subscribe(() => {
      this.render();
    });
    this.render();
  }

  onunload(): void {
    this.unsubscribe?.();
  }

  private render(): void {
    this.containerEl.empty();
    const root = this.containerEl.createDiv({ cls: "graphite-daily-codeblock" });

    if (!this.settings.dailyNotesIntegrationEnabled) {
      root.createDiv({
        cls: "graphite-empty graphite-empty-small",
        text: "graphite Daily Notes integration is disabled in settings."
      });
      return;
    }

    const date = this.resolveDate();
    if (!date) {
      root.createDiv({
        cls: "graphite-empty graphite-empty-small",
        text: "graphite could not detect a date for this note."
      });
      return;
    }

    const tasks = this.store.getCompletedTasksForDate(date);
    const header = root.createDiv({ cls: "graphite-daily-codeblock-header" });
    const heading = header.createDiv();
    heading.createDiv({
      cls: "graphite-daily-codeblock-title",
      text: formatDailyBlockTitle(date)
    });
    heading.createDiv({
      cls: "graphite-daily-codeblock-subtitle",
      text: tasks.length === 1 ? "1 completed task" : `${tasks.length} completed tasks`
    });

    const openButton = header.createEl("button", {
      cls: "graphite-daily-codeblock-open",
      text: "Open in graphite"
    });
    openButton.addEventListener("click", () => {
      this.openDailyNote(date, this.sourcePath);
    });

    if (tasks.length === 0) {
      root.createDiv({
        cls: "graphite-empty graphite-empty-small",
        text: "No tasks completed on this day."
      });
      return;
    }

    const list = root.createDiv({ cls: "graphite-daily-codeblock-list" });
    for (const task of tasks) {
      this.renderTaskRow(list, task);
    }
  }

  private renderTaskRow(parent: HTMLElement, task: GraphiteTask): void {
    const row = parent.createDiv({ cls: "graphite-daily-codeblock-row" });
    renderLinkedText(task.title, row.createDiv({ cls: "graphite-daily-codeblock-task-title" }), {
      app: this.app,
      sourcePath: task.sourcePath || this.sourcePath
    });

    const meta = row.createDiv({ cls: "graphite-daily-codeblock-meta" });
    const project = normalizeTaskProject(task.project);
    if (project) {
      const color = getProjectColor(project, this.settings.projectColors);
      const chip = meta.createSpan({ cls: "graphite-daily-codeblock-chip" });
      chip.setCssStyles({ backgroundColor: color.light });
      chip.createSpan({ cls: "graphite-project-dot" }).setCssStyles({
        backgroundColor: color.regular
      });
      chip.createSpan({ text: project });
    }

    if (hasVisiblePriority(task.priority)) {
      meta.createSpan({
        cls: `graphite-daily-codeblock-chip graphite-activity-priority ${getPriorityClass(task.priority)}`,
        text: getPriorityDisplayLabel(task.priority)
      });
    }

    for (const label of task.labels) {
      const color = getLabelColor(label, this.settings.labelColors);
      const chip = meta.createSpan({
        cls: "graphite-daily-codeblock-chip graphite-daily-codeblock-label",
        text: displayLabel(label)
      });
      chip.setCssStyles({
        backgroundColor: color.light,
        borderColor: color.light
      });
    }

    if (meta.childElementCount === 0) {
      meta.createSpan({ text: "Completed" });
    }
  }

  private resolveDate(): string | null {
    const optionMatch = this.source.match(DATE_OPTION_RE);
    if (optionMatch) {
      return optionMatch[1];
    }

    const lineMatch = this.source.match(DATE_LINE_RE);
    if (lineMatch) {
      return lineMatch[1];
    }

    return dailyNoteDateFromPath(this.sourcePath, this.settings.dailyNoteDateFormat);
  }
}

function formatDailyBlockTitle(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return `Completed tasks · ${date}`;
  }

  const formatted = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    weekday: "short"
  }).format(parsed);
  return `Completed tasks · ${formatted}`;
}
