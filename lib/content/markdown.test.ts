import { describe, expect, it } from "vitest";
import { linkifyRefs, renderMarkdown } from "./markdown";

describe("linkifyRefs", () => {
  it.each([
    ["See Exod 34:6.", "See [Exod 34:6](/verse/?ref=Exo.34.6)."],
    ["John 14:9 and Heb 1:3", "[John 14:9](/verse/?ref=Jhn.14.9) and [Heb 1:3](/verse/?ref=Heb.1.3)"],
    ["in 1 Cor 13:4–7", "in [1 Cor 13:4–7](/verse/?ref=1Co.13.4)"],
    ["Ps 23", "Ps 23"],
    ["Romans 5:10-11", "[Romans 5:10-11](/verse/?ref=Rom.5.10)"],
    ["Is 53:5", "[Is 53:5](/verse/?ref=Isa.53.5)"],
  ])("%s", (src, out) => expect(linkifyRefs(src)).toBe(out));

  it("leaves non-book words alone", () => expect(linkifyRefs("In 1990 5:30 pm")).toBe("In 1990 5:30 pm"));
  it("does not relink existing links", () => expect(linkifyRefs("[John 3:16](/x)")).toBe("[John 3:16](/x)"));
});

describe("renderMarkdown", () => {
  it("escapes raw HTML", () => {
    expect(renderMarkdown("<script>alert(1)</script> **love**")).toBe(
      "<p>&lt;script&gt;alert(1)&lt;/script&gt; <strong>love</strong></p>\n",
    );
  });
  it("links scripture references", () => {
    expect(renderMarkdown("Read John 14:9.")).toContain('<a href="/verse/?ref=Jhn.14.9">John 14:9</a>');
  });
  it("blocks javascript: links", () => {
    expect(renderMarkdown("[x](javascript:alert(1))")).not.toContain("href=\"javascript:");
  });
});
