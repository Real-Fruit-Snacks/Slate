import { Priority } from "./types";

export interface PriorityColor {
  name: string;
  color: string;
  light: string;
}

export const PRIORITY_COLORS: Record<Priority, PriorityColor> = {
  P1: {
    name: "Priority 1",
    color: "var(--color-red)",
    light: "rgba(var(--color-red-rgb), 0.14)"
  },
  P2: {
    name: "Priority 2",
    color: "var(--color-orange)",
    light: "rgba(var(--color-orange-rgb), 0.14)"
  },
  P3: {
    name: "Priority 3",
    color: "var(--color-blue)",
    light: "rgba(var(--color-blue-rgb), 0.14)"
  },
  P4: {
    name: "Priority 4",
    color: "var(--graphite-muted)",
    light: "transparent"
  },
  none: {
    name: "Priority",
    color: "var(--graphite-muted)",
    light: "transparent"
  }
};

export function getPriorityColor(priority: Priority): PriorityColor {
  return PRIORITY_COLORS[priority] || PRIORITY_COLORS.none;
}

export function getPriorityLabel(priority: Priority): string {
  return getPriorityColor(priority).name;
}

export function isDefaultPriority(priority: Priority | undefined): boolean {
  return !priority || priority === "P4" || priority === "none";
}

export function hasVisiblePriority(priority: Priority | undefined): boolean {
  return !isDefaultPriority(priority);
}

export function getPriorityDropdownLabel(priority: Priority): string {
  if (priority === "none") return "Priority 4";
  return getPriorityColor(priority).name;
}

export function getPriorityDisplayLabel(priority: Priority | undefined): string {
  if (isDefaultPriority(priority)) return "Priority";
  return priority || "Priority";
}

export function getPriorityClass(priority: Priority): string {
  if (isDefaultPriority(priority)) return "";
  return `priority-${priority.toLowerCase()}`;
}
