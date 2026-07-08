import { describe, it, expect } from "vitest";
import { compareTasksByMode } from "../src/taskSorting";
import { SlateSortMode, SlateTask } from "../src/types";

let seq = 0;
function t(over: Partial<SlateTask>): SlateTask {
  return {
    id: `task-${seq++}`,
    title: "Task",
    completed: false,
    priority: "none",
    labels: [],
    attachments: [],
    extraProperties: [],
    order: seq,
    ...over
  };
}

function sortIds(tasks: SlateTask[], mode: SlateSortMode): string[] {
  return [...tasks].sort((a, b) => compareTasksByMode(a, b, mode)).map((task) => task.id);
}

describe("compareTasksByMode", () => {
  it("priority mode ranks P1 < P2 < P3 < default", () => {
    const p3 = t({ id: "p3", priority: "P3" });
    const p1 = t({ id: "p1", priority: "P1" });
    const p4 = t({ id: "p4", priority: "P4" });
    const p2 = t({ id: "p2", priority: "P2" });
    expect(sortIds([p3, p1, p4, p2], "priority")).toEqual(["p1", "p2", "p3", "p4"]);
  });

  it("due mode sorts by ascending due date, undated last", () => {
    const later = t({ id: "later", due: "2026-07-10" });
    const undated = t({ id: "undated" });
    const soon = t({ id: "soon", due: "2026-07-01" });
    expect(sortIds([later, undated, soon], "due")).toEqual(["soon", "later", "undated"]);
  });

  it("alphabetical mode sorts by title", () => {
    const c = t({ id: "c", title: "Charlie" });
    const a = t({ id: "a", title: "Alpha" });
    const b = t({ id: "b", title: "Bravo" });
    expect(sortIds([c, a, b], "alphabetical")).toEqual(["a", "b", "c"]);
  });

  it("created mode sorts newest first", () => {
    const old = t({ id: "old", created: "2026-01-01" });
    const recent = t({ id: "recent", created: "2026-07-01" });
    expect(sortIds([old, recent], "created")).toEqual(["recent", "old"]);
  });

  it("smart mode leads with priority", () => {
    const plain = t({ id: "plain", priority: "none", due: "2026-07-01" });
    const urgent = t({ id: "urgent", priority: "P1", due: "2026-12-31" });
    expect(sortIds([plain, urgent], "smart")).toEqual(["urgent", "plain"]);
  });
});
