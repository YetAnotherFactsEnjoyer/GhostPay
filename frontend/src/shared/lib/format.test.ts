import { describe, expect, it } from "vitest";
import { money } from "./format";

describe("money", () => {
  it("formats integer minor units without floating point input", () => {
    expect(money(12345)).toContain("123.45");
    expect(money(1)).toContain("0.01");
  });
});
