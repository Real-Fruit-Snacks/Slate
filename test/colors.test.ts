import { describe, it, expect } from "vitest";
import {
  colorForName,
  getProjectColor,
  getLabelColor,
  resolveColorToHex,
  GRAPHITE_COLOR_PALETTE
} from "../src/colors";

describe("colorForName", () => {
  it("is deterministic for the same name", () => {
    expect(colorForName("Client Work")).toEqual(colorForName("Client Work"));
  });

  it("picks a palette entry (theme var) when there is no override", () => {
    const paletteRegulars = GRAPHITE_COLOR_PALETTE.map((c) => c.regular);
    expect(paletteRegulars).toContain(colorForName("Client Work").regular);
  });

  it("uses the override when provided", () => {
    expect(colorForName("anything", "#abcdef").regular).toBe("#abcdef");
  });
});

describe("getProjectColor", () => {
  it("returns a theme-var regular for a generated project color", () => {
    expect(getProjectColor("Work", {}).regular).toMatch(/^var\(--/);
  });

  it("honors a hex override and derives a translucent tint", () => {
    const color = getProjectColor("Work", { Work: "#3366cc" });
    expect(color.regular).toBe("#3366cc");
    expect(color.light).toBe("rgba(51, 102, 204, 0.14)");
  });
});

describe("getLabelColor", () => {
  it("honors a direct override by normalized name", () => {
    expect(getLabelColor("work", { work: "#123456" }).regular).toBe("#123456");
  });

  it("generates a stable theme-var color with no override", () => {
    expect(getLabelColor("focus", {}).regular).toMatch(/^var\(--/);
  });
});

describe("resolveColorToHex", () => {
  it("returns a hex value unchanged", () => {
    expect(resolveColorToHex("#a1b2c3")).toBe("#a1b2c3");
  });

  it("falls back to a neutral hex when no DOM is available", () => {
    // In the Node test environment there is no `document`, so a var() color
    // cannot be resolved and the documented fallback is returned.
    expect(resolveColorToHex("var(--color-red)")).toBe("#888888");
  });
});
