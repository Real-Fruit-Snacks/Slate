import { App, Modal, TFile } from "obsidian";
import { createGraphiteIcon } from "../ui/components/GraphiteIcon";

export class ImagePreviewModal extends Modal {
  private openedBody: Element | null = null;
  private handleEscape = (event: KeyboardEvent): void => {
    if (event.key !== "Escape") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    this.close();
  };

  constructor(
    app: App,
    private file: TFile,
    private label: string
  ) {
    super(app);
  }

  onOpen(): void {
    this.openedBody = activeDocument.body;
    this.openedBody.classList.add("graphite-image-preview-open");
    this.containerEl.addClass("graphite-image-lightbox-backdrop");
    this.modalEl.addClass("graphite-image-lightbox-modal");
    this.modalEl.addEventListener("keydown", this.handleEscape, true);
    this.contentEl.empty();
    this.contentEl.addClass("graphite-image-lightbox-content");

    this.modalEl.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    this.containerEl.addEventListener("click", (event) => {
      if (event.target === this.containerEl) {
        event.preventDefault();
        event.stopPropagation();
        this.close();
      }
    });

    const shell = this.contentEl.createDiv({ cls: "graphite-image-lightbox-shell" });

    shell.createEl("img", {
      cls: "graphite-image-lightbox-img",
      attr: {
        src: this.app.vault.getResourcePath(this.file),
        alt: this.label
      }
    });

    const closeButton = shell.createEl("button", {
      cls: "graphite-image-lightbox-close",
      attr: {
        type: "button",
        "aria-label": "Close image preview"
      }
    });
    createGraphiteIcon(closeButton, "close");
    closeButton.addEventListener("click", () => this.close());
  }

  onClose(): void {
    this.openedBody?.classList.remove("graphite-image-preview-open");
    this.openedBody = null;
    this.modalEl.removeEventListener("keydown", this.handleEscape, true);
  }
}
