import { describe, it, expect } from "vitest";
import {
  toIsoDate,
  isIsoDate,
  compareIsoDates,
  daysBetweenIsoDates,
  isBeforeToday,
  isToday,
  isAfterToday,
  formatDueDateChip,
  todayIso,
  yesterdayIso,
  addDaysIso
} from "../src/dateUtils";

describe("toIsoDate / isIsoDate", () => {
  it("formats a local Date as YYYY-MM-DD (month is 1-based)", () => {
    expect(toIsoDate(new Date(2024, 0, 5))).toBe("2024-01-05");
    expect(toIsoDate(new Date(2024, 11, 31))).toBe("2024-12-31");
  });

  it("validates ISO date strings strictly", () => {
    expect(isIsoDate("2024-01-05")).toBe(true);
    expect(isIsoDate("2024-1-5")).toBe(false);
    expect(isIsoDate("not a date")).toBe(false);
    expect(isIsoDate(undefined)).toBe(false);
  });
});

describe("compareIsoDates / daysBetweenIsoDates", () => {
  it("orders dates and reports equality", () => {
    expect(compareIsoDates("2024-01-01", "2024-01-02")).toBe(-1);
    expect(compareIsoDates("2024-01-02", "2024-01-01")).toBe(1);
    expect(compareIsoDates("2024-01-01", "2024-01-01")).toBe(0);
  });

  it("counts whole days between dates, or null for invalid input", () => {
    expect(daysBetweenIsoDates("2024-01-01", "2024-01-08")).toBe(7);
    expect(daysBetweenIsoDates("2024-01-08", "2024-01-01")).toBe(-7);
    expect(daysBetweenIsoDates("bad", "2024-01-01")).toBeNull();
  });
});

describe("relative-to-today helpers", () => {
  it("classifies yesterday/today/tomorrow", () => {
    expect(isBeforeToday(yesterdayIso())).toBe(true);
    expect(isToday(todayIso())).toBe(true);
    expect(isAfterToday(addDaysIso(1))).toBe(true);
    expect(isBeforeToday(todayIso())).toBe(false);
  });

  it("labels the due-date chip", () => {
    expect(formatDueDateChip(todayIso())).toBe("Today");
    expect(formatDueDateChip(addDaysIso(1))).toBe("Tomorrow");
    expect(formatDueDateChip(undefined)).toBe("Date");
  });
});
