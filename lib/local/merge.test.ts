import { describe, expect, it } from "vitest";
import type { BlockView } from "@/lib/data/types";
import { mergeBlocks } from "./merge";
import type { LocalEdit } from "./store";

const block = (key: string, body: string): BlockView => ({
  id: 1, key, section: "lens", title: null, type: "lens_commentary", consensus: "n/a", status: "draft", author: "claude",
  bodyMd: body, bodyHtml: `<p>${body}</p>`, by: null, citations: [], needsSource: false,
});
const edit = (key: string, subject: string, body: string, deleted = false): LocalEdit => ({
  key, subject, deleted, section: "lens", type: "lens_commentary", title: null, by: null, consensus: "n/a", bodyMd: body,
  reviewed: true, citations: [], updatedAt: "2026-10-14T00:00:00Z",
});

describe("mergeBlocks", () => {
  const library = [block("a", "one"), block("b", "two")];
  it("replaces changed blocks, hides deleted ones and appends new ones for this subject only", () => {
    const merged = mergeBlocks(
      library,
      {
        a: edit("a", "verse:Jhn.3.16", "changed"),
        b: edit("b", "verse:Jhn.3.16", "two", true),
        "local-1": edit("local-1", "verse:Jhn.3.16", "mine"),
        "local-2": edit("local-2", "verse:Jhn.3.17", "elsewhere"),
      },
      "verse:Jhn.3.16",
    );
    expect(merged.map((b) => b.bodyMd)).toEqual(["changed", "mine"]);
    expect(merged[0].author).toBe("owner");
    expect(merged[0].status).toBe("reviewed");
  });
  it("leaves the library alone without edits", () => expect(mergeBlocks(library, {}, "verse:Jhn.3.16")).toEqual(library));
});
