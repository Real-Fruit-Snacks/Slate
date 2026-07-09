import { App, Modal } from "obsidian";
import { createGraphiteButton } from "../ui";

export interface ConfirmModalOptions {
  title: string;
  message?: string;
  confirmText: string;
  onConfirm: () => void | Promise<void>;
}

/**
 * A small reusable confirmation dialog: a title, an optional message, and a
 * Cancel / destructive-confirm button row. Escape or Cancel dismisses without
 * acting; the confirm button runs `onConfirm`, then closes.
 */
export class ConfirmModal extends Modal {
  constructor(app: App, private options: ConfirmModalOptions) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("graphite-confirm-modal");
    contentEl.createEl("h2", { text: this.options.title });
    if (this.options.message) {
      contentEl.createEl("p", { text: this.options.message, cls: "graphite-modal-desc" });
    }

    const actions = contentEl.createDiv({ cls: "graphite-label-prompt-actions" });
    createGraphiteButton(actions, { text: "Cancel" }).addEventListener("click", () => this.close());
    createGraphiteButton(actions, {
      text: this.options.confirmText,
      variant: "destructive"
    }).addEventListener("click", () => {
      void Promise.resolve(this.options.onConfirm()).then(() => this.close());
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
