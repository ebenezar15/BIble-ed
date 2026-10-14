import { describe, expect, it } from "vitest";
import { cleanGloss, cleanSurface, cleanTranslit } from "./display";

describe("display cleaning", () => {
  it("removes STEP morpheme separators from Hebrew", () => {
    expect(cleanSurface("הָ/אָֽרֶץ\\׃")).toBe("הָאָֽרֶץ׃");
    expect(cleanSurface("בְּ/רֵאשִׁ֖ית")).toBe("בְּרֵאשִׁ֖ית");
  });
  it("cleans transliterations and glosses", () => {
    expect(cleanTranslit("ha./'A.retz")).toBe("ha.'A.retz");
    expect(cleanGloss("the/ earth")).toBe("the earth");
    expect(cleanGloss("and/ <obj.>")).toBe("and <obj.>");
  });
  it("leaves Greek alone", () => expect(cleanSurface("κόσμον,")).toBe("κόσμον,"));
});
