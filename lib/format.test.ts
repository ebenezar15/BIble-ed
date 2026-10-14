import { describe, expect, it } from "vitest";
import { festivalDate, lifeDates } from "./format";

describe("format", () => {
  it("shows BC and AD life dates", () => {
    expect(lifeDates(-4, 65)).toBe("c. 4 BC – AD 65");
    expect(lifeDates(130, 202)).toBe("130–202");
    expect(lifeDates(null, 1536)).toBe("died 1536");
    expect(lifeDates(1948, null)).toBe("born 1948");
    expect(lifeDates(null, null)).toBe("");
  });
  it("handles festivals that cross into the next month", () => {
    expect(festivalDate({ month: 9, day_start: 25, day_end: 2, end_month: 10 })).toBe("Kislev 25 – Tevet 2");
    expect(festivalDate({ month: 1, day_start: 15, day_end: 21 })).toBe("Nisan 15–21");
    expect(festivalDate({ month: 7, day_start: 10, day_end: 10 })).toBe("Tishri 10");
    expect(festivalDate({ month: null })).toBe("");
  });
});
