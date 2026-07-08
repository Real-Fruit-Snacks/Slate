import { describe, it, expect } from "vitest";
import { parseTasks, parseTaskDocument } from "../src/parser";
import { serializeTasks, serializeTaskDocument } from "../src/serializer";
import { SlateTask } from "../src/types";

function makeTask(over: Partial<SlateTask> = {}): SlateTask {
  return {
    id: "task-1",
    title: "Write report",
    completed: false,
    priority: "P2",
    labels: [],
    attachments: [],
    extraProperties: [],
    order: 0,
    ...over
  };
}

describe("task round-trip (serialize -> parse)", () => {
  it("preserves a fully populated task", () => {
    const task = makeTask({
      created: "2026-07-01",
      due: "2026-07-08",
      deadline: "2026-07-10",
      project: "Work",
      priority: "P2",
      description: "Keep it short.",
      labels: ["writing", "report"],
      attachments: ["_slate_files/Attachments/task-1/a.png"]
    });

    const [p] = parseTasks(serializeTasks([task]));

    expect(p.id).toBe("task-1");
    expect(p.title).toBe("Write report");
    expect(p.completed).toBe(false);
    expect(p.created).toBe("2026-07-01");
    expect(p.due).toBe("2026-07-08");
    expect(p.deadline).toBe("2026-07-10");
    expect(p.project).toBe("Work");
    expect(p.priority).toBe("P2");
    expect(p.description).toBe("Keep it short.");
    expect(p.labels).toEqual(["writing", "report"]);
    expect(p.attachments).toEqual(["_slate_files/Attachments/task-1/a.png"]);
  });

  it("preserves completion state and completed date", () => {
    const task = makeTask({ completed: true, completedDate: "2026-07-05" });
    const [p] = parseTasks(serializeTasks([task]));
    expect(p.completed).toBe(true);
    expect(p.completedDate).toBe("2026-07-05");
  });

  it("preserves parentId and completedOccurrences", () => {
    const task = makeTask({
      parentId: "task-parent",
      completedOccurrences: ["2026-07-01", "2026-07-08"]
    });
    const [p] = parseTasks(serializeTasks([task]));
    expect(p.parentId).toBe("task-parent");
    expect(p.completedOccurrences).toEqual(["2026-07-01", "2026-07-08"]);
  });

  it("preserves a repeat rule through serialization", () => {
    const task = makeTask({
      due: "2026-07-08",
      repeat: {
        frequency: "weekly",
        interval: 1,
        mode: "scheduledDate",
        ends: "never",
        weekday: 3,
        weekdays: [3]
      }
    });
    const [p] = parseTasks(serializeTasks([task]));
    expect(p.repeat?.frequency).toBe("weekly");
    expect(p.repeat?.weekdays).toEqual([3]);
  });

  it("preserves a multi-line description", () => {
    const task = makeTask({ description: "First line\nSecond line\n\nAfter a gap" });
    const [p] = parseTasks(serializeTasks([task]));
    expect(p.description).toBe("First line\nSecond line\n\nAfter a gap");
  });

  it("preserves unknown extra properties", () => {
    const task = makeTask({ extraProperties: [{ name: "customKey", value: "custom value" }] });
    const [p] = parseTasks(serializeTasks([task]));
    expect(p.extraProperties).toContainEqual({ name: "customKey", value: "custom value" });
  });
});

describe("document round-trip (non-destructive)", () => {
  const doc = [
    "# My tasks",
    "",
    "Some freeform note.",
    "",
    "- [ ] First task",
    "  id:: task-a",
    "  priority:: P4",
    "",
    "- [x] Second task",
    "  id:: task-b",
    "  completed:: 2026-07-05",
    "  priority:: P1",
    "",
    "Trailing note."
  ].join("\n");

  it("keeps raw non-task lines and both tasks", () => {
    const parsed = parseTaskDocument(doc, "2026-07.md");
    expect(parsed.tasks.map((t) => t.id)).toEqual(["task-a", "task-b"]);
    const rawText = parsed.blocks
      .filter((b) => b.type === "raw")
      .flatMap((b) => (b.type === "raw" ? b.lines : []))
      .join("\n");
    expect(rawText).toContain("# My tasks");
    expect(rawText).toContain("Some freeform note.");
    expect(rawText).toContain("Trailing note.");
  });

  it("re-serializing then re-parsing yields identical task ids and order", () => {
    const parsed = parseTaskDocument(doc, "2026-07.md");
    const reserialized = serializeTaskDocument(parsed, parsed.tasks);
    const reparsed = parseTaskDocument(reserialized, "2026-07.md");
    expect(reparsed.tasks.map((t) => t.id)).toEqual(["task-a", "task-b"]);
    expect(reserialized).toContain("# My tasks");
    expect(reserialized).toContain("Trailing note.");
  });
});

describe("parser resilience", () => {
  it("assigns a fallback id and 'Untitled task' when missing", () => {
    const [p] = parseTasks("- [ ] \n");
    expect(p.title).toBe("Untitled task");
    expect(p.id).toBeTruthy();
  });

  it("returns no tasks for an empty document", () => {
    expect(parseTasks("")).toEqual([]);
  });
});
