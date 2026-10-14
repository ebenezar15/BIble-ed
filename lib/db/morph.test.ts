import { describe, expect, it } from "vitest";
import { morphParts } from "./morph";

describe("morphParts", () => {
  it("splits Hebrew compounds and carries the language prefix", () => {
    expect(morphParts("HR/Ncfsa")).toEqual(["HR", "HNcfsa"]);
    expect(morphParts("HPi//R/Sp2mp")).toEqual(["HPi", "HR", "HSp2mp"]);
    expect(morphParts("AC/Ncfsa")).toEqual(["AC", "ANcfsa"]);
  });
  it("leaves Greek codes whole", () => {
    expect(morphParts("V-AAI-3S")).toEqual(["V-AAI-3S"]);
  });
  it("handles empty input", () => expect(morphParts("")).toEqual([]));
});
