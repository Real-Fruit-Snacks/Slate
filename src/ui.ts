import { createGraphiteIcon } from "./ui/components/GraphiteIcon";

export type GraphiteButtonVariant = "default" | "primary" | "danger" | "destructive" | "ghost";
export type GraphiteButtonSize = "sm" | "md";
export type GraphiteChipVariant = "default" | "outline" | "muted";

type GraphiteAttrs = Record<string, string>;

interface GraphiteButtonOptions {
  text?: string;
  icon?: string;
  variant?: GraphiteButtonVariant;
  size?: GraphiteButtonSize;
  className?: string;
  attr?: GraphiteAttrs;
  disabled?: boolean;
}

interface GraphiteIconButtonOptions extends Omit<GraphiteButtonOptions, "text"> {
  ariaLabel: string;
}

interface GraphiteChipOptions {
  text?: string;
  icon?: string;
  variant?: GraphiteChipVariant;
  className?: string;
  attr?: GraphiteAttrs;
}

interface GraphiteTextInputOptions {
  type?: string;
  value?: string;
  placeholder?: string;
  className?: string;
  attr?: GraphiteAttrs;
}

interface GraphiteActionRowOptions {
  className?: string;
}

const BUTTON_VARIANTS: Record<GraphiteButtonVariant, string> = {
  default: "",
  primary: "graphite-ui-button-primary graphite-button-primary",
  danger: "graphite-ui-button-danger graphite-button-danger",
  destructive: "graphite-ui-button-destructive graphite-button-destructive",
  ghost: "graphite-ui-button-ghost"
};

const BUTTON_SIZES: Record<GraphiteButtonSize, string> = {
  sm: "graphite-ui-button-sm",
  md: "graphite-ui-button-md"
};

const CHIP_VARIANTS: Record<GraphiteChipVariant, string> = {
  default: "",
  outline: "graphite-ui-chip-outline",
  muted: "graphite-ui-chip-muted"
};

export function createGraphiteButton(
  parent: HTMLElement,
  options: GraphiteButtonOptions = {}
): HTMLButtonElement {
  const button = parent.createEl("button", {
    cls: classNames(
      "graphite-ui-button",
      "graphite-button",
      BUTTON_VARIANTS[options.variant || "default"],
      BUTTON_SIZES[options.size || "md"],
      options.className
    ),
    attr: {
      type: "button",
      ...(options.attr || {})
    }
  });

  if (options.icon) {
    createGraphiteIcon(button, options.icon, { className: "graphite-ui-icon" });
  }
  if (options.text) {
    button.createSpan({ cls: "graphite-ui-button-label", text: options.text });
  }
  if (options.disabled) {
    button.setAttr("disabled", "true");
  }

  return button;
}

export function createGraphiteIconButton(
  parent: HTMLElement,
  options: GraphiteIconButtonOptions
): HTMLButtonElement {
  return createGraphiteButton(parent, {
    ...options,
    className: classNames("graphite-ui-icon-button", options.className),
    attr: {
      "aria-label": options.ariaLabel,
      ...(options.attr || {})
    }
  });
}

export function createGraphiteChip(parent: HTMLElement, options: GraphiteChipOptions): HTMLElement {
  const chip = parent.createSpan({
    cls: classNames(
      "graphite-ui-chip",
      CHIP_VARIANTS[options.variant || "default"],
      options.className
    ),
    attr: options.attr
  });

  if (options.icon) {
    createGraphiteIcon(chip, options.icon, { className: "graphite-ui-icon" });
  }
  if (options.text) {
    chip.createSpan({ cls: "graphite-ui-chip-label", text: options.text });
  }

  return chip;
}

export function createGraphiteTextInput(
  parent: HTMLElement,
  options: GraphiteTextInputOptions = {}
): HTMLInputElement {
  return parent.createEl("input", {
    cls: classNames("graphite-ui-input", options.className),
    attr: {
      type: options.type || "text",
      ...(options.placeholder ? { placeholder: options.placeholder } : {}),
      ...(options.value ? { value: options.value } : {}),
      ...(options.attr || {})
    }
  });
}

export function createGraphiteActionRow(
  parent: HTMLElement,
  options: GraphiteActionRowOptions = {}
): HTMLElement {
  return parent.createDiv({
    cls: classNames("graphite-ui-actions", options.className)
  });
}

export function createGraphiteBottomBar(
  parent: HTMLElement,
  options: GraphiteActionRowOptions = {}
): HTMLElement {
  return parent.createDiv({
    cls: classNames("graphite-ui-bottom-bar", options.className)
  });
}

function classNames(...parts: Array<string | undefined | false>): string {
  return parts.filter(Boolean).join(" ");
}
