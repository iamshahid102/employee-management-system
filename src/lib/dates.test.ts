import { describe, expect, it } from "vitest";

import { daysSince, nextAnniversary, todayUtc } from "@/lib/dates";

describe("nextAnniversary", () => {
  const today = new Date(Date.UTC(2026, 10, 10)); // 10 Nov 2026

  it("returns today when the anniversary is today", () => {
    const result = nextAnniversary("2020-11-10", today);
    expect(result).toMatchObject({ date: "2026-11-10", years: 6, daysAway: 0 });
  });

  it("returns this year's upcoming anniversary", () => {
    const result = nextAnniversary("2019-12-01", today);
    expect(result).toMatchObject({ date: "2026-12-01", years: 7, daysAway: 21 });
  });

  it("rolls to next year once this year's date has passed", () => {
    const result = nextAnniversary("2018-03-15", today);
    expect(result).toMatchObject({ date: "2027-03-15", years: 9 });
  });

  it("handles leap-day starts without throwing", () => {
    const result = nextAnniversary("2020-02-29", today);
    expect(result.date).toBe("2027-03-01");
    expect(result.years).toBe(7);
  });
});

describe("daysSince", () => {
  it("is zero for today", () => {
    expect(daysSince("2026-11-10", new Date(Date.UTC(2026, 10, 10)))).toBe(0);
  });

  it("is negative for future dates", () => {
    expect(daysSince("2026-11-17", new Date(Date.UTC(2026, 10, 10)))).toBe(-7);
  });

  it("uses UTC midnight for today", () => {
    const today = todayUtc(new Date("2026-11-10T23:30:00Z"));
    expect(today.toISOString()).toBe("2026-11-10T00:00:00.000Z");
  });
});
