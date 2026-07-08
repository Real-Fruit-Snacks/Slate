import { App, Modal, Notice } from "obsidian";
import { RepeatFrequency, RepeatRule } from "../types";
import { getRepeatLabel, getRepeatWeekdays, normalizeRepeatRule } from "../repeatUtils";
import { createSlateActionRow, createSlateButton } from "../ui";
import { createSlateIcon } from "../ui/components/SlateIcon";
import { SlateDropdown } from "../ui/components/SlateDropdown";

const FREQ_LABELS: Record<RepeatFrequency, string> = {
  daily: "Day",
  weekly: "Week",
  weekdays: "Weekday",
  monthly: "Month",
  yearly: "Year"
};

const DISPLAY_DAYS = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
  { label: "Sun", value: 0 },
];

export class CustomRepeatModal extends Modal {
  private draft: RepeatRule;
  private onSave: (rule: RepeatRule) => void;
  private freqDropdown: SlateDropdown | null = null;

  constructor(app: App, current: RepeatRule | undefined, onSave: (rule: RepeatRule) => void) {
    super(app);
    this.onSave = onSave;
    this.draft = current
      ? normalizeRepeatRule(current)
      : { frequency: "weekly", interval: 1, mode: "scheduledDate", ends: "never" };
  }

  onOpen(): void {
    this.titleEl.setText("Custom repeat");
    this.modalEl.addClass("slate-custom-repeat-modal");
    this.render();
  }

  onClose(): void {
    this.freqDropdown?.destroy();
    this.freqDropdown = null;
    this.contentEl.empty();
  }

  private render(): void {
    const { contentEl } = this;
    contentEl.empty();

    // Based on
    this.renderSection(contentEl, "Based on");
    const modeWrap = contentEl.createDiv({ cls: "slate-repeat-radio-group" });
    this.renderRadio(modeWrap, "Scheduled date", this.draft.mode === "scheduledDate", () => {
      this.draft.mode = "scheduledDate";
      this.render();
    });
    this.renderRadio(modeWrap, "Completed date", this.draft.mode === "completedDate", () => {
      this.draft.mode = "completedDate";
      this.clearWeekdays();
      this.render();
    });

    // Every
    this.renderSection(contentEl, "Every");
    const everyRow = contentEl.createDiv({ cls: "slate-repeat-every-row" });
    const intervalInput = everyRow.createEl("input", {
      cls: "slate-repeat-interval-input",
      attr: { type: "number", min: "1", step: "1", value: String(this.draft.interval) }
    });
    intervalInput.addEventListener("input", () => {
      const v = parseInt(intervalInput.value);
      if (v >= 1 && Number.isInteger(v)) {
        this.draft.interval = v;
      }
    });
    intervalInput.addEventListener("blur", () => {
      const v = parseInt(intervalInput.value);
      this.draft.interval = (v >= 1 && Number.isInteger(v)) ? v : 1;
      intervalInput.value = String(this.draft.interval);
    });

    const freqs: RepeatFrequency[] = ["daily", "weekly", "weekdays", "monthly", "yearly"];
    this.freqDropdown?.destroy();
    this.freqDropdown = new SlateDropdown({
      triggerParent: everyRow,
      triggerClassName: "slate-repeat-freq-trigger",
      ariaLabel: "Frequency",
      getOptions: () => freqs.map((f) => ({ value: f, label: FREQ_LABELS[f] })),
      getValue: () => this.draft.frequency,
      onSelect: (value) => {
        this.draft.frequency = value as RepeatFrequency;
        if (this.draft.frequency !== "weekly") {
          this.clearWeekdays();
        }
        this.render();
      }
    });

    // On (weekday selector) — only for weekly + scheduledDate
    if (this.draft.frequency === "weekly" && this.draft.mode === "scheduledDate") {
      this.renderSection(contentEl, "On");
      const dayRow = contentEl.createDiv({ cls: "slate-repeat-day-row" });
      const selectedWeekdays = getRepeatWeekdays(this.draft);
      for (const { label, value } of DISPLAY_DAYS) {
        const btn = dayRow.createEl("button", {
          cls: "slate-repeat-day-btn",
          text: label,
          attr: { type: "button" }
        });
        btn.toggleClass("is-active", selectedWeekdays.includes(value));
        btn.addEventListener("click", () => {
          const current = getRepeatWeekdays(this.draft);
          const next = current.includes(value)
            ? current.filter((weekday) => weekday !== value)
            : [...current, value];
          this.setWeekdays(next);
          this.render();
        });
      }
    }

    // Ends
    this.renderSection(contentEl, "Ends");
    const endsWrap = contentEl.createDiv({ cls: "slate-repeat-radio-group" });

    this.renderRadio(endsWrap, "Never", this.draft.ends === "never", () => {
      this.draft.ends = "never";
      this.draft.endsDate = undefined;
      this.draft.endsCount = undefined;
      this.render();
    });

    const onDateRow = endsWrap.createDiv({ cls: "slate-repeat-ends-row" });
    this.renderRadio(onDateRow, "On date", this.draft.ends === "onDate", () => {
      this.draft.ends = "onDate";
      this.draft.endsCount = undefined;
      this.render();
    });
    if (this.draft.ends === "onDate") {
      const dateInput = onDateRow.createEl("input", {
        cls: "slate-repeat-ends-date",
        attr: { type: "date", value: this.draft.endsDate || "" }
      });
      dateInput.addEventListener("change", () => {
        this.draft.endsDate = dateInput.value || undefined;
      });
    }

    const afterRow = endsWrap.createDiv({ cls: "slate-repeat-ends-row" });
    this.renderRadio(afterRow, "After", this.draft.ends === "afterOccurrences", () => {
      this.draft.ends = "afterOccurrences";
      this.draft.endsDate = undefined;
      this.render();
    });
    if (this.draft.ends === "afterOccurrences") {
      const countInput = afterRow.createEl("input", {
        cls: "slate-repeat-ends-count",
        attr: { type: "number", min: "1", step: "1", value: String(this.draft.endsCount || 1) }
      });
      countInput.addEventListener("input", () => {
        const v = parseInt(countInput.value);
        if (v >= 1) this.draft.endsCount = v;
      });
      afterRow.createSpan({ cls: "slate-repeat-ends-label", text: "occurrences" });
    }

    // Preview
    const preview = contentEl.createDiv({ cls: "slate-repeat-preview" });
    createSlateIcon(preview, "recurring", { className: "slate-chip-icon" });
    preview.createSpan({ text: getRepeatLabel(this.draft) });

    // Actions
    const actions = createSlateActionRow(contentEl, { className: "slate-repeat-modal-actions" });
    const cancelBtn = createSlateButton(actions, { text: "Cancel" });
    const saveBtn = createSlateButton(actions, { text: "Save", variant: "primary" });
    const requiresWeekdays = this.requiresWeekdays();
    saveBtn.toggleAttribute("disabled", requiresWeekdays && getRepeatWeekdays(this.draft).length === 0);

    cancelBtn.addEventListener("click", () => this.close());
    saveBtn.addEventListener("click", () => {
      if (this.requiresWeekdays() && getRepeatWeekdays(this.draft).length === 0) {
        new Notice("Choose at least one weekday.");
        return;
      }

      const v = parseInt(intervalInput.value);
      this.draft.interval = (v >= 1 && Number.isInteger(v)) ? v : 1;
      this.onSave(normalizeRepeatRule(this.draft));
      this.close();
    });
  }

  private renderSection(parent: HTMLElement, title: string): void {
    parent.createEl("h3", { cls: "slate-repeat-section-title", text: title });
  }

  private renderRadio(parent: HTMLElement, label: string, checked: boolean, onClick: () => void): HTMLElement {
    const row = parent.createDiv({ cls: `slate-repeat-radio-row${checked ? " is-checked" : ""}` });
    const dot = row.createDiv({ cls: "slate-repeat-radio-dot" });
    if (checked) dot.addClass("is-active");
    row.createSpan({ text: label });
    row.addEventListener("click", onClick);
    return row;
  }

  private requiresWeekdays(): boolean {
    return this.draft.frequency === "weekly" && this.draft.mode === "scheduledDate";
  }

  private clearWeekdays(): void {
    delete this.draft.weekday;
    delete this.draft.weekdays;
  }

  private setWeekdays(values: number[]): void {
    const weekdays = DISPLAY_DAYS
      .map(({ value }) => value)
      .filter((value) => values.includes(value));

    if (weekdays.length === 0) {
      this.clearWeekdays();
      return;
    }

    this.draft.weekdays = weekdays;
    this.draft.weekday = weekdays[0];
  }
}
