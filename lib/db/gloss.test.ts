import { describe, expect, it } from "vitest";
import { coreGloss, groupGlosses } from "./gloss";

describe("coreGloss", () => {
  it.each([
    ["covenant loyalty/ his", "covenant loyalty"],
    ["according to/ covenant loyalty/ your", "covenant loyalty"],
    ["[the] covenant loyalti<es>/ of", "covenant loyalties"],
    ["[The] book", "book"],
    ["in/ beginning", "beginning"],
    ["loved", "loved"],
    ["Loyalty", "loyalty"],
  ])("%s → %s", (raw, core) => expect(coreGloss(raw)).toBe(core));
});

describe("groupGlosses", () => {
  it("merges variants and sorts by count", () => {
    expect(
      groupGlosses([
        { gloss: "covenant loyalty/ his", count: 54 },
        { gloss: "covenant loyalty", count: 44 },
        { gloss: "loyalty", count: 24 },
      ]),
    ).toEqual([
      { gloss: "covenant loyalty", count: 98 },
      { gloss: "loyalty", count: 24 },
    ]);
  });
});
