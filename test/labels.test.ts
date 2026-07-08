import { describe, it, expect } from "vitest";
import { normalizeLabelName, displayLabel, dedupeLabels } from "../src/labels";

describe("normalizeLabelName", () => {
  it("strips a leading hash and lowercases", () => {
    expect(normalizeLabelName("#Work")).toBe("work");
  });

  it("collapses whitespace to single hyphens", () => {
    expect(normalizeLabelName("My  Label")).toBe("my-label");
  });

  it("collapses and trims repeated hyphens", () => {
    expect(normalizeLabelName("--a---b--")).toBe("a-b");
  });

  it("returns empty string for a bare hash or blank", () => {
    expect(normalizeLabelName("#")).toBe("");
    expect(normalizeLabelName("   ")).toBe("");
  });

  it("strips multiple leading hashes and surrounding space", () => {
    expect(normalizeLabelName("##  Deep Work ")).toBe("deep-work");
  });
});

describe("displayLabel", () => {
  it("prefixes the normalized label with a hash", () => {
    expect(displayLabel("Deep Work")).toBe("#deep-work");
  });

  it("returns a bare hash for an empty label", () => {
    expect(displayLabel("  ")).toBe("#");
  });
});

describe("dedupeLabels", () => {
  it("dedupes by normalized form, keeping first occurrence order", () => {
    expect(dedupeLabels(["Work", "work", "#WORK", "Home"])).toEqual(["work", "home"]);
  });

  it("drops empty and whitespace-only entries", () => {
    expect(dedupeLabels(["", "  ", "#", "focus"])).toEqual(["focus"]);
  });

  it("returns an empty array for no input", () => {
    expect(dedupeLabels([])).toEqual([]);
  });
});
