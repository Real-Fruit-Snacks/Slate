import { compareIsoDates } from "./dateUtils";
import { projectDisplayName } from "./projects";
import { GraphiteSortMode, GraphiteTask } from "./types";

export function compareTasksByMode(
  a: GraphiteTask,
  b: GraphiteTask,
  mode: GraphiteSortMode
): number {
  if (mode === "due") {
    return (
      compareOptionalDateAsc(a.due, b.due) ||
      byOrder(a, b)
    );
  }

  if (mode === "priority") {
    return (
      comparePriority(a, b) ||
      compareOptionalDateAsc(a.deadline, b.deadline) ||
      compareOptionalDateAsc(a.due, b.due) ||
      byOrder(a, b)
    );
  }

  if (mode === "deadline") {
    return (
      compareOptionalDateAsc(a.deadline, b.deadline) ||
      byOrder(a, b)
    );
  }

  if (mode === "created") {
    return (
      compareOptionalDateDesc(a.created, b.created) ||
      byOrder(a, b)
    );
  }

  if (mode === "project") {
    return (
      projectDisplayName(a.project).localeCompare(projectDisplayName(b.project)) ||
      compareSmart(a, b)
    );
  }

  if (mode === "alphabetical") {
    return a.title.localeCompare(b.title) || byOrder(a, b);
  }

  return compareSmart(a, b);
}

function byOrder(a: GraphiteTask, b: GraphiteTask): number {
  return a.order - b.order;
}

function compareSmart(a: GraphiteTask, b: GraphiteTask): number {
  return (
    comparePriority(a, b) ||
    compareOptionalDateAsc(a.deadline, b.deadline) ||
    compareOptionalDateAsc(a.due, b.due) ||
    compareOptionalDateAsc(a.created, b.created) ||
    byOrder(a, b)
  );
}

function comparePriority(a: GraphiteTask, b: GraphiteTask): number {
  return priorityRank(a.priority) - priorityRank(b.priority);
}

function priorityRank(priority: GraphiteTask["priority"]): number {
  if (priority === "P1") {
    return 0;
  }
  if (priority === "P2") {
    return 1;
  }
  if (priority === "P3") {
    return 2;
  }
  return 3;
}

function compareOptionalDateAsc(
  a: string | undefined,
  b: string | undefined
): number {
  if (a && b) {
    return compareIsoDates(a, b);
  }
  if (a) {
    return -1;
  }
  if (b) {
    return 1;
  }
  return 0;
}

function compareOptionalDateDesc(
  a: string | undefined,
  b: string | undefined
): number {
  if (a && b) {
    return compareIsoDates(b, a);
  }
  if (a) {
    return -1;
  }
  if (b) {
    return 1;
  }
  return 0;
}
