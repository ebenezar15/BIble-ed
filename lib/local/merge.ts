import { renderMarkdown } from "@/lib/content/markdown";
import type { BlockView } from "@/lib/data/types";
import type { LocalEdit } from "./store";

export function editToBlock(e: LocalEdit): BlockView {
  return {
    id: e.key,
    key: e.key,
    section: e.section,
    title: e.title,
    type: e.type,
    consensus: e.consensus,
    status: e.reviewed ? "reviewed" : "draft",
    author: "owner",
    bodyMd: e.bodyMd,
    bodyHtml: renderMarkdown(e.bodyMd),
    by: e.by,
    citations: e.citations.map((c) => ({ ...c, copyright: null })),
    needsSource: e.type === "scholarly_interpretation" && e.citations.length === 0,
  };
}

/** The library's blocks for a subject with this browser's edits applied: changed, hidden or added. */
export function mergeBlocks(library: BlockView[], edits: Record<string, LocalEdit>, subject: string): BlockView[] {
  const out: BlockView[] = [];
  for (const b of library) {
    const e = edits[b.key];
    if (!e) out.push(b);
    else if (!e.deleted) out.push(editToBlock(e));
  }
  for (const e of Object.values(edits)) {
    if (e.subject === subject && e.key.startsWith("local-") && !e.deleted) out.push(editToBlock(e));
  }
  return out;
}
