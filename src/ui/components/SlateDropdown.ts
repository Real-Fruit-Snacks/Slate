import { alignLocalPopover } from "../popover";

export interface SlateDropdownOption {
  value: string;
  label: string;
  /** Optional colored dot shown beside the option (and the default trigger). */
  dotColor?: string;
  /** Optional section heading rendered above the first option that uses it. */
  section?: string;
}

export interface SlateDropdownConfig {
  getOptions: () => SlateDropdownOption[];
  getValue: () => string;
  onSelect: (value: string) => void;
  ariaLabel?: string;
  preferredSide?: "above" | "below";
  menuClassName?: string;
  /**
   * Provide an existing element to act as the trigger. When omitted, a default
   * trigger (dot + label + caret) is created under `triggerParent`.
   */
  trigger?: HTMLElement;
  triggerParent?: HTMLElement;
  triggerClassName?: string;
  /**
   * Called after the value changes so callers using a custom `trigger` can
   * update its visuals. `option` is the currently selected option, if any.
   */
  onRenderTrigger?: (option: SlateDropdownOption | null) => void;
}

/**
 * A themed replacement for a native `<select>`. The trigger is a dark pill; the
 * option list is a body-mounted popover styled to match the app's other
 * popovers, so it never falls back to the OS's white dropdown. Supports colored
 * dots, section headings, keyboard navigation, and outside-click dismissal.
 */
export class SlateDropdown {
  readonly triggerEl: HTMLElement;
  private labelEl: HTMLElement | null = null;
  private dotEl: HTMLElement | null = null;
  private menuEl: HTMLElement | null = null;
  private detachOutside: () => void = () => undefined;

  constructor(private config: SlateDropdownConfig) {
    if (config.trigger) {
      this.triggerEl = config.trigger;
    } else {
      const parent = config.triggerParent;
      if (!parent) {
        throw new Error("SlateDropdown requires either `trigger` or `triggerParent`.");
      }
      this.triggerEl = this.buildDefaultTrigger(parent);
    }

    this.triggerEl.setAttribute("role", "combobox");
    this.triggerEl.setAttribute("aria-haspopup", "listbox");
    this.triggerEl.setAttribute("aria-expanded", "false");
    if (config.ariaLabel) {
      this.triggerEl.setAttribute("aria-label", config.ariaLabel);
    }
    if (!this.triggerEl.hasAttribute("tabindex") && this.triggerEl.tagName !== "BUTTON") {
      this.triggerEl.setAttribute("tabindex", "0");
    }

    this.triggerEl.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.toggle();
    });
    this.triggerEl.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        this.open();
      }
    });

    this.refresh();
  }

  /** Re-read the current value/options and update the trigger (and open menu). */
  refresh(): void {
    const option = this.currentOption();
    if (this.labelEl) {
      this.labelEl.setText(option ? option.label : "");
    }
    if (this.dotEl) {
      const color = option?.dotColor;
      this.dotEl.toggleClass("is-hidden", !color);
      if (color) {
        this.dotEl.setCssStyles({ backgroundColor: color });
      }
    }
    this.config.onRenderTrigger?.(option);
    if (this.menuEl) {
      this.renderMenu();
    }
  }

  toggle(): void {
    if (this.menuEl) {
      this.close();
    } else {
      this.open();
    }
  }

  open(): void {
    if (this.menuEl) {
      return;
    }

    const doc = this.triggerEl.ownerDocument;
    const menu = doc.createElement("div");
    menu.className = "slate-dropdown-menu";
    if (this.config.menuClassName) {
      menu.classList.add(this.config.menuClassName);
    }
    menu.setAttribute("role", "listbox");
    doc.body.appendChild(menu);
    this.menuEl = menu;
    this.triggerEl.setAttribute("aria-expanded", "true");

    this.renderMenu();
    alignLocalPopover(this.triggerEl, menu, {
      preferredSide: this.config.preferredSide,
      useFixed: true
    });

    const handleOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        (this.triggerEl.contains(event.target) || menu.contains(event.target))
      ) {
        return;
      }
      this.close();
    };
    doc.addEventListener("pointerdown", handleOutside, true);
    this.detachOutside = () => doc.removeEventListener("pointerdown", handleOutside, true);

    const firstOption = menu.querySelector<HTMLElement>(".slate-dropdown-option");
    firstOption?.focus({ preventScroll: true });
  }

  close(): void {
    this.detachOutside();
    this.detachOutside = () => undefined;
    this.menuEl?.remove();
    this.menuEl = null;
    this.triggerEl.setAttribute("aria-expanded", "false");
  }

  destroy(): void {
    this.close();
    if (!this.config.trigger) {
      this.triggerEl.remove();
    }
  }

  private buildDefaultTrigger(parent: HTMLElement): HTMLElement {
    const trigger = parent.createEl("button", {
      cls: "slate-dropdown-trigger",
      attr: { type: "button" }
    });
    if (this.config.triggerClassName) {
      trigger.addClass(this.config.triggerClassName);
    }
    this.dotEl = trigger.createSpan({ cls: "slate-dropdown-dot is-hidden" });
    this.labelEl = trigger.createSpan({ cls: "slate-dropdown-trigger-label" });
    trigger.createSpan({ cls: "slate-dropdown-caret" });
    return trigger;
  }

  private currentOption(): SlateDropdownOption | null {
    const value = this.config.getValue();
    return this.config.getOptions().find((option) => option.value === value) || null;
  }

  private renderMenu(): void {
    const menu = this.menuEl;
    if (!menu) {
      return;
    }

    menu.empty();
    const selected = this.config.getValue();
    let lastSection: string | undefined;

    for (const option of this.config.getOptions()) {
      if (option.section && option.section !== lastSection) {
        menu.createDiv({ cls: "slate-dropdown-section", text: option.section });
        lastSection = option.section;
      }

      const isSelected = option.value === selected;
      const item = menu.createEl("button", {
        cls: "slate-dropdown-option",
        attr: {
          type: "button",
          role: "option",
          "aria-selected": String(isSelected),
          tabindex: "-1"
        }
      });
      item.toggleClass("is-selected", isSelected);
      item.createSpan({
        cls: "slate-dropdown-option-check",
        text: isSelected ? "✓" : ""
      });
      if (option.dotColor) {
        item
          .createSpan({ cls: "slate-dropdown-option-dot" })
          .setCssStyles({ backgroundColor: option.dotColor });
      }
      item.createSpan({ cls: "slate-dropdown-option-label", text: option.label });

      item.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.close();
        this.config.onSelect(option.value);
      });
      item.addEventListener("keydown", (event) => this.handleMenuKeydown(event, item));
    }
  }

  private handleMenuKeydown(event: KeyboardEvent, item: HTMLElement): void {
    if (event.key === "Escape") {
      event.preventDefault();
      this.close();
      this.triggerEl.focus({ preventScroll: true });
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = item.nextElementSibling as HTMLElement | null;
      this.focusOption(next, "next");
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      const previous = item.previousElementSibling as HTMLElement | null;
      this.focusOption(previous, "previous");
    }
  }

  private focusOption(start: HTMLElement | null, direction: "next" | "previous"): void {
    let candidate = start;
    while (candidate && !candidate.classList.contains("slate-dropdown-option")) {
      candidate = (direction === "next"
        ? candidate.nextElementSibling
        : candidate.previousElementSibling) as HTMLElement | null;
    }
    candidate?.focus({ preventScroll: true });
  }
}
