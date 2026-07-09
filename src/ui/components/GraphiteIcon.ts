import { setIcon } from "obsidian";
import { GraphiteIconInput, resolveGraphiteIcon } from "../icons/graphiteIcons";

interface GraphiteIconOptions {
  ariaLabel?: string;
  className?: string;
  size?: number;
  strokeWidth?: number;
}

export function createGraphiteIcon(
  parent: HTMLElement,
  icon: GraphiteIconInput,
  options: GraphiteIconOptions = {}
): HTMLElement {
  const iconEl = parent.createSpan({
    cls: classNames("graphite-icon", options.className),
    attr: options.ariaLabel
      ? { "aria-label": options.ariaLabel, role: "img" }
      : { "aria-hidden": "true" }
  });

  setIcon(iconEl, resolveGraphiteIcon(icon));
  applyIconOptions(iconEl, options);
  return iconEl;
}

export function setGraphiteIcon(
  el: HTMLElement,
  icon: GraphiteIconInput,
  options: GraphiteIconOptions = {}
): void {
  el.empty();
  createGraphiteIcon(el, icon, options);
}

function applyIconOptions(el: HTMLElement, options: GraphiteIconOptions): void {
  const props: Record<string, string> = {};
  if (options.size) {
    props["--graphite-icon-size"] = `${options.size}px`;
  }
  if (options.strokeWidth) {
    props["--graphite-icon-stroke-width"] = String(options.strokeWidth);
  }
  if (Object.keys(props).length > 0) {
    el.setCssProps(props);
  }
}

function classNames(...parts: Array<string | undefined | false>): string {
  return parts.filter(Boolean).join(" ");
}
