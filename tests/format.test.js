import { describe, it, expect } from "vitest";
import { fmt, fmtW, today, calcDelta, getDday } from "../src/lib/format.js";

describe("format helpers", () => {
  it("formats numbers with thousands separators and treats empty as 0", () => {
    expect(fmt(1234567)).toBe((1234567).toLocaleString());
    expect(fmt(undefined)).toBe("0");
    expect(fmtW(5000)).toBe("₩" + (5000).toLocaleString());
    expect(fmtW(null)).toBe("₩0");
  });
  it("today() is an ISO date", () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it("calcDelta returns change, percent and direction, or null without a baseline", () => {
    expect(calcDelta(120, 100)).toEqual({ val: 20, pct: 20, up: true });
    expect(calcDelta(80, 100)).toEqual({ val: -20, pct: -20, up: false });
    expect(calcDelta(100, 0)).toBeNull();
    expect(calcDelta(0, 100)).toBeNull();
  });
  it("getDday counts whole days from today (local calendar dates)", () => {
    const localIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const d = new Date(); d.setDate(d.getDate() + 3);
    expect(getDday(localIso(d))).toBe(3);
    expect(getDday(localIso(new Date()))).toBe(0);
  });
});
