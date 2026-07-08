import { describe, it, expect } from "vitest";
import {
  getPriorityColor,
  getPriorityLabel,
  isDefaultPriority,
  hasVisiblePriority,
  getPriorityDropdownLabel,
  getPriorityDisplayLabel,
  getPriorityClass
} from "../src/priority";

describe("priority helpers", () => {
  it("maps priorities to display names", () => {
    expect(getPriorityColor("P1").name).toBe("Priority 1");
    expect(getPriorityLabel("P2")).toBe("Priority 2");
  });

  it("treats P4/none/undefined as the default priority", () => {
    expect(isDefaultPriority("P4")).toBe(true);
    expect(isDefaultPriority("none")).toBe(true);
    expect(isDefaultPriority(undefined)).toBe(true);
    expect(isDefaultPriority("P1")).toBe(false);
  });

  it("reports visible priority only for P1–P3", () => {
    expect(hasVisiblePriority("P1")).toBe(true);
    expect(hasVisiblePriority("P4")).toBe(false);
  });

  it("dropdown label maps none -> Priority 4", () => {
    expect(getPriorityDropdownLabel("none")).toBe("Priority 4");
    expect(getPriorityDropdownLabel("P1")).toBe("Priority 1");
  });

  it("display label is blank-ish for default and the code otherwise", () => {
    expect(getPriorityDisplayLabel("P4")).toBe("Priority");
    expect(getPriorityDisplayLabel("P1")).toBe("P1");
  });

  it("class is empty for default and priority-pN otherwise", () => {
    expect(getPriorityClass("P4")).toBe("");
    expect(getPriorityClass("P1")).toBe("priority-p1");
  });
});
