import { describe, it, expect } from "vitest";
import { App } from "./stubs/obsidian";
import { TaskStore } from "../src/taskStore";
import { DEFAULT_SETTINGS } from "../src/settings";
import { parseTasks } from "../src/parser";
import { createFakeApp, FakeVault } from "./helpers/fakeApp";

function makeStore(): { store: TaskStore; vault: FakeVault } {
  const { app, vault } = createFakeApp();
  const settings = { ...DEFAULT_SETTINGS, dataFolderPath: "_graphite_files" };
  const store = new TaskStore(app as unknown as App, settings);
  return { store, vault };
}

function monthlyFile(vault: FakeVault): string {
  const path = [...vault.files.keys()].find((p) => /Data\/\d{4}-\d{2}\.md$/.test(p));
  if (!path) {
    throw new Error("no monthly data file was written");
  }
  return vault.files.get(path) as string;
}

describe("TaskStore — CRUD", () => {
  it("creates a task and exposes it in memory", async () => {
    const { store } = makeStore();
    await store.load();
    await store.createTask({ title: "Buy milk" });

    const tasks = store.getTasks();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe("Buy milk");
    expect(tasks[0].completed).toBe(false);
  });

  it("persists a created task to a monthly markdown file", async () => {
    const { store, vault } = makeStore();
    await store.load();
    await store.createTask({ title: "Persist me", priority: "P2" });

    const parsed = parseTasks(monthlyFile(vault));
    expect(parsed).toHaveLength(1);
    expect(parsed[0].title).toBe("Persist me");
    expect(parsed[0].priority).toBe("P2");
  });

  it("toggles completion and writes it through", async () => {
    const { store, vault } = makeStore();
    await store.load();
    await store.createTask({ title: "Task" });
    const id = store.getTasks()[0].id;

    await store.toggleComplete(id);

    expect(store.getTasks()[0].completed).toBe(true);
    expect(parseTasks(monthlyFile(vault))[0].completed).toBe(true);
  });

  it("updates fields", async () => {
    const { store } = makeStore();
    await store.load();
    await store.createTask({ title: "Task" });
    const id = store.getTasks()[0].id;

    await store.updateTask(id, { priority: "P1", due: "2026-07-08" });

    const task = store.getTasks()[0];
    expect(task.priority).toBe("P1");
    expect(task.due).toBe("2026-07-08");
  });

  it("deletes a task", async () => {
    const { store } = makeStore();
    await store.load();
    await store.createTask({ title: "Temp" });
    const id = store.getTasks()[0].id;

    await store.deleteTask(id);

    expect(store.getTasks()).toHaveLength(0);
  });
});

describe("TaskStore — recurring completion", () => {
  it("advances a recurring task's due date instead of completing it", async () => {
    const { store } = makeStore();
    await store.load();
    await store.createTask({
      title: "Standup",
      due: "2026-07-07",
      repeat: { frequency: "daily", interval: 1, mode: "scheduledDate", ends: "never" }
    });
    const id = store.getTasks()[0].id;

    await store.toggleComplete(id);

    const task = store.getTasks()[0];
    expect(task.completed).toBe(false);
    expect(task.due).toBe("2026-07-08");
    expect(task.completedOccurrences).toHaveLength(1);
  });
});

describe("TaskStore — cross-file concurrency (reconcile regression)", () => {
  it("does not drop an edit when two source files are edited concurrently", async () => {
    const { store, vault } = makeStore();
    vault.folders.add("_graphite_files");
    vault.folders.add("_graphite_files/Data");
    vault.files.set(
      "_graphite_files/Data/2026-06.md",
      ["- [ ] Task A", "  id:: a", "  created:: 2026-06-15", "  priority:: P4"].join("\n")
    );
    vault.files.set(
      "_graphite_files/Data/2026-07.md",
      ["- [ ] Task B", "  id:: b", "  created:: 2026-07-15", "  priority:: P4"].join("\n")
    );

    await store.load();
    expect(store.getTasks().map((t) => t.id).sort()).toEqual(["a", "b"]);

    // Fire both completions before either has settled — the scenario that used
    // to clobber the second edit via a whole-array rebuild from stale documents.
    await Promise.all([store.toggleComplete("a"), store.toggleComplete("b")]);

    expect(store.getTasks().every((t) => t.completed)).toBe(true);
    expect(parseTasks(vault.files.get("_graphite_files/Data/2026-06.md") as string)[0].completed).toBe(true);
    expect(parseTasks(vault.files.get("_graphite_files/Data/2026-07.md") as string)[0].completed).toBe(true);
  });
});
