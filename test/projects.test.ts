import { describe, it, expect } from "vitest";
import {
  cleanProjectName,
  isReservedInboxProject,
  normalizeTaskProject,
  projectDisplayName,
  uniqueRealProjects
} from "../src/projects";

describe("cleanProjectName", () => {
  it("trims and strips a leading blockquote marker", () => {
    expect(cleanProjectName("  > Client Work ")).toBe("Client Work");
  });

  it("returns empty string for null/undefined", () => {
    expect(cleanProjectName(null)).toBe("");
    expect(cleanProjectName(undefined)).toBe("");
  });
});

describe("isReservedInboxProject", () => {
  it("matches 'Inbox' case-insensitively", () => {
    expect(isReservedInboxProject("inbox")).toBe(true);
    expect(isReservedInboxProject("INBOX")).toBe(true);
    expect(isReservedInboxProject("Work")).toBe(false);
  });
});

describe("normalizeTaskProject", () => {
  it("returns undefined for blank or the reserved Inbox name", () => {
    expect(normalizeTaskProject("")).toBeUndefined();
    expect(normalizeTaskProject("Inbox")).toBeUndefined();
    expect(normalizeTaskProject(null)).toBeUndefined();
  });

  it("returns the cleaned project name for a real project", () => {
    expect(normalizeTaskProject("  Client Work ")).toBe("Client Work");
  });
});

describe("projectDisplayName", () => {
  it("shows Inbox for empty/reserved and the name otherwise", () => {
    expect(projectDisplayName("")).toBe("Inbox");
    expect(projectDisplayName("Inbox")).toBe("Inbox");
    expect(projectDisplayName("Work")).toBe("Work");
  });
});

describe("uniqueRealProjects", () => {
  it("dedupes, drops Inbox/blank, and sorts alphabetically", () => {
    expect(
      uniqueRealProjects(["Work", "work_extra", "Inbox", "", "Alpha", "Work"])
    ).toEqual(["Alpha", "Work", "work_extra"]);
  });
});
