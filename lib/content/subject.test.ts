import { describe, expect, it } from "vitest";
import { subjectHref, subjectLabel } from "./subject";

describe("subject helpers", () => {
  it("never throw on malformed subjects", () => {
    expect(subjectLabel("entry:foo")).toBe("foo");
    expect(subjectHref("entry:foo")).toBe("/");
    expect(subjectLabel("verse:Jhn.3.16")).toBe("John 3:16");
  });
});
