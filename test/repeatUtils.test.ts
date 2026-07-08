import { describe, it, expect } from "vitest";
import {
  nextOccurrence,
  parseRepeat,
  serializeRepeat,
  normalizeRepeatRule,
  isRepeatEnded,
  repeatRulesEqual
} from "../src/repeatUtils";
import { RepeatRule } from "../src/types";

// Anchor: 2024-01-01 is a Monday (getDay() === 1); the week runs
// 01=Mon, 02=Tue, 03=Wed, 04=Thu, 05=Fri, 06=Sat, 07=Sun.
const base = (over: Partial<RepeatRule>): RepeatRule => ({
  frequency: "daily",
  interval: 1,
  mode: "scheduledDate",
  ends: "never",
  ...over
});

describe("nextOccurrence — daily", () => {
  it("advances by one day at interval 1", () => {
    expect(nextOccurrence(base({ frequency: "daily" }), "2026-07-07")).toBe("2026-07-08");
  });
  it("advances by the interval in days", () => {
    expect(nextOccurrence(base({ frequency: "daily", interval: 3 }), "2024-01-01")).toBe("2024-01-04");
  });
});

describe("nextOccurrence — weekdays (skip weekends)", () => {
  it("moves to the next weekday", () => {
    expect(nextOccurrence(base({ frequency: "weekdays" }), "2024-01-01")).toBe("2024-01-02");
  });
  it("jumps Friday to Monday", () => {
    expect(nextOccurrence(base({ frequency: "weekdays" }), "2024-01-05")).toBe("2024-01-08");
  });
});

describe("nextOccurrence — weekly", () => {
  it("advances to the next selected weekday later this week", () => {
    // Mon -> next Wed
    expect(
      nextOccurrence(base({ frequency: "weekly", weekday: 3, weekdays: [3] }), "2024-01-01")
    ).toBe("2024-01-03");
  });
  it("with multiple weekdays picks the nearest upcoming one", () => {
    // Mon, days [Mon,Wed,Fri] -> Wed
    expect(
      nextOccurrence(base({ frequency: "weekly", weekdays: [1, 3, 5] }), "2024-01-01")
    ).toBe("2024-01-03");
  });
  it("wraps to next week when no selected day remains", () => {
    // Fri, days [Mon,Wed,Fri] -> next Mon
    expect(
      nextOccurrence(base({ frequency: "weekly", weekdays: [1, 3, 5] }), "2024-01-05")
    ).toBe("2024-01-08");
  });
  it("falls back to +7*interval when no weekday is set (completed mode)", () => {
    expect(
      nextOccurrence(base({ frequency: "weekly", mode: "completedDate", interval: 2 }), "2024-01-01")
    ).toBe("2024-01-15");
  });
});

describe("nextOccurrence — monthly (clamps to month length)", () => {
  it("keeps the day of month", () => {
    expect(nextOccurrence(base({ frequency: "monthly", dayOfMonth: 15 }), "2024-01-15")).toBe("2024-02-15");
  });
  it("clamps Jan 31 to Feb 29 in a leap year", () => {
    expect(nextOccurrence(base({ frequency: "monthly", dayOfMonth: 31 }), "2024-01-31")).toBe("2024-02-29");
  });
});

describe("nextOccurrence — yearly (clamps Feb 29)", () => {
  it("clamps Feb 29 to Feb 28 in a non-leap year", () => {
    expect(nextOccurrence(base({ frequency: "yearly", month: 2, dayOfMonth: 29 }), "2024-02-29")).toBe("2025-02-28");
  });
});

describe("parse/serialize round-trip", () => {
  it("serializes to JSON and parses back to the normalized rule", () => {
    const rule = base({ frequency: "weekly", weekdays: [1, 3], ends: "afterOccurrences", endsCount: 5 });
    const serialized = serializeRepeat(rule);
    const parsed = parseRepeat(serialized);
    expect(parsed).toBeDefined();
    expect(serializeRepeat(parsed as RepeatRule)).toBe(serialized);
  });

  it("parses the legacy pipe format", () => {
    expect(parseRepeat("daily")?.frequency).toBe("daily");
    expect(parseRepeat("weekly|3")?.weekday).toBe(3);
    expect(parseRepeat("monthly|15")?.dayOfMonth).toBe(15);
    const yearly = parseRepeat("yearly|6|20");
    expect(yearly?.month).toBe(6);
    expect(yearly?.dayOfMonth).toBe(20);
  });

  it("returns undefined for empty or malformed input", () => {
    expect(parseRepeat(undefined)).toBeUndefined();
    expect(parseRepeat("{not json")).toBeUndefined();
  });
});

describe("normalizeRepeatRule", () => {
  it("coerces a non-positive interval to 1 and fills defaults", () => {
    const n = normalizeRepeatRule({ frequency: "daily", interval: 0, mode: "scheduledDate", ends: "never" });
    expect(n.interval).toBe(1);
    expect(n.ends).toBe("never");
    expect(n.mode).toBe("scheduledDate");
  });
  it("drops weekdays for non-weekly frequencies", () => {
    const n = normalizeRepeatRule(base({ frequency: "monthly", weekdays: [1, 2], weekday: 1 }));
    expect(n.weekdays).toBeUndefined();
    expect(n.weekday).toBeUndefined();
  });
});

describe("isRepeatEnded", () => {
  it("never-ending rules are never ended", () => {
    expect(isRepeatEnded(base({ ends: "never" }), 99, "2999-01-01")).toBe(false);
  });
  it("onDate ends when the next date passes the end date", () => {
    const rule = base({ ends: "onDate", endsDate: "2024-06-01" });
    expect(isRepeatEnded(rule, 0, "2024-06-02")).toBe(true);
    expect(isRepeatEnded(rule, 0, "2024-05-31")).toBe(false);
  });
  it("afterOccurrences ends when the count is reached", () => {
    const rule = base({ ends: "afterOccurrences", endsCount: 3 });
    expect(isRepeatEnded(rule, 3, "2024-01-01")).toBe(true);
    expect(isRepeatEnded(rule, 2, "2024-01-01")).toBe(false);
  });
});

describe("repeatRulesEqual", () => {
  it("treats two undefined rules as equal and mixed as unequal", () => {
    expect(repeatRulesEqual(undefined, undefined)).toBe(true);
    expect(repeatRulesEqual(base({}), undefined)).toBe(false);
  });
  it("compares by normalized serialized form", () => {
    expect(repeatRulesEqual(base({ interval: 1 }), base({ interval: 0 }))).toBe(true);
  });
});
