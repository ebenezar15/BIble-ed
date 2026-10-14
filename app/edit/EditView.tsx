"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { SECTION_TITLES } from "@/components/content/Block";
import { TypeChip, type ContentType } from "@/components/ui/TypeChip";
import { BLOCK_SECTIONS, BLOCK_TYPES, CONSENSUS } from "@/lib/content/enums";
import { subjectHref, subjectLabel } from "@/lib/content/subject";
import { data } from "@/lib/data/browser";
import type { BlockView, PersonSummary, Work } from "@/lib/data/types";
import { useLoad, useTitle } from "@/lib/data/use";
import { SUBJECT } from "@/lib/edit/validate";
import { mergeBlocks } from "@/lib/local/merge";
import {
  citationId, deleteEdit, getEdits, revertEdit, saveEdit, updateEdit, useEdits, type LocalEdit,
} from "@/lib/local/store";

const TYPE_LABEL: Record<string, string> = {
  lexical_fact: "Lexical fact", historical_fact: "Historical fact", scholarly_interpretation: "Scholarly interpretation (named view)",
  lens_commentary: "Lens commentary (the app's view)", contested: "Contested", legal_reading_history: "How the legal reading arose",
};

const field = "w-full rounded border border-border bg-surface px-2 py-1";

/** A browser copy of a block, so its citations can be changed. */
function asEdit(b: BlockView, subject: string): Omit<LocalEdit, "updatedAt"> {
  return {
    key: b.key, subject, section: b.section, type: b.type, title: b.title, by: b.by, consensus: b.consensus,
    bodyMd: b.bodyMd, reviewed: b.status === "reviewed",
    citations: b.citations.map((c) => ({ id: String(c.id), ref: c.ref, url: c.url, workId: c.workId, workTitle: c.workTitle, verified: c.verified })),
  };
}

function ensureEdit(b: BlockView, subject: string) {
  if (!getEdits()[b.key]) saveEdit({ ...toInput(asEdit(b, subject)), key: b.key, citations: asEdit(b, subject).citations });
}

function toInput(e: Omit<LocalEdit, "updatedAt">) {
  return {
    subject: e.subject, section: e.section, type: e.type, title: e.title, by: e.by?.id ?? null, byName: e.by?.name ?? null,
    consensus: e.consensus, body: e.bodyMd, reviewed: e.reviewed,
  };
}

function BlockForm({
  subject, block, people, onSaved,
}: { subject: string; block?: BlockView; people: PersonSummary[]; onSaved?: () => void }) {
  const [error, setError] = useState<string | null>(null);
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const by = String(f.get("by") ?? "");
    try {
      saveEdit({
        key: block?.key,
        subject,
        section: String(f.get("section")),
        type: String(f.get("type")),
        title: String(f.get("title") ?? "") || null,
        by: by || null,
        byName: people.find((p) => p.id === by)?.name ?? null,
        consensus: String(f.get("consensus") ?? "n/a"),
        body: String(f.get("body") ?? ""),
        reviewed: f.get("reviewed") === "on",
        citations: block?.citations.map((c) => ({ id: String(c.id), ref: c.ref, url: c.url, workId: c.workId, workTitle: c.workTitle, verified: c.verified })),
      });
      setError(null);
      if (!block) e.currentTarget.reset();
      onSaved?.();
    } catch (err) {
      setError((err as Error).message);
    }
  }
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm">Section
          <select name="section" defaultValue={block?.section ?? "notes"} className={field}>
            {BLOCK_SECTIONS.map((s) => <option key={s} value={s}>{SECTION_TITLES[s] ?? s}</option>)}
          </select>
        </label>
        <label className="text-sm">Content type
          <select name="type" defaultValue={block?.type ?? "lens_commentary"} className={field}>
            {BLOCK_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
          </select>
        </label>
        <label className="text-sm">Scholarly standing
          <select name="consensus" defaultValue={block?.consensus ?? "n/a"} className={field}>
            {CONSENSUS.map((c) => <option key={c} value={c}>{c === "n/a" ? "Not applicable" : c}</option>)}
          </select>
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Heading (optional)
          <input name="title" defaultValue={block?.title ?? ""} className={field} />
        </label>
        <label className="text-sm">Whose view (for scholarly interpretation)
          <select name="by" defaultValue={block?.by?.id ?? ""} className={field}>
            <option value="">Nobody named</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
      </div>
      <label className="block text-sm">Text (Markdown; write refs like John 14:9 to link them)
        <textarea name="body" required rows={block ? 8 : 5} defaultValue={block?.bodyMd ?? ""} className={`${field} font-mono text-sm`} />
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" name="reviewed" defaultChecked={block ? block.status === "reviewed" : true} className="size-4" />
          Reviewed by me
        </label>
        <button className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-bg">{block ? "Save changes" : "Add block"}</button>
      </div>
      {error && <p role="alert" className="text-sm text-hebrew">{error}</p>}
    </form>
  );
}

function Citations({ subject, block, works }: { subject: string; block: BlockView; works: Work[] }) {
  function change(fn: (e: LocalEdit) => LocalEdit) {
    ensureEdit(block, subject);
    updateEdit(block.key, fn);
  }
  return (
    <div className="mt-4 border-t border-border pt-3">
      <p className="text-sm font-semibold">Citations</p>
      {block.needsSource && <p className="text-sm text-muted">Source needed: add a citation for this view.</p>}
      <ul className="mt-2 space-y-2 text-sm">
        {block.citations.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-2">
            <span>{c.workTitle && <cite className="not-italic font-semibold">{c.workTitle}, </cite>}{c.ref}</span>
            <button
              type="button"
              onClick={() => change((e) => ({ ...e, citations: e.citations.map((x) => (x.id === String(c.id) ? { ...x, verified: !x.verified } : x)) }))}
              className={`rounded-full border px-2 text-xs ${c.verified ? "border-accent text-accent" : "border-border text-muted"}`}
            >
              {c.verified ? "Checked ✓ (undo)" : "Mark as checked"}
            </button>
            <button type="button" className="text-xs text-muted underline"
              onClick={() => change((e) => ({ ...e, citations: e.citations.filter((x) => x.id !== String(c.id)) }))}>
              Remove
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-3 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const ref = String(f.get("ref") ?? "").trim();
          const workId = String(f.get("workId") ?? "") || null;
          if (!ref) return;
          change((x) => ({
            ...x,
            citations: [...x.citations, { id: citationId(), ref, url: null, workId, workTitle: works.find((w) => w.id === workId)?.title ?? null, verified: false }],
          }));
          e.currentTarget.reset();
        }}
      >
        <select name="workId" aria-label="Work" className="min-w-0 flex-1 rounded border border-border bg-bg px-2 py-1 text-sm">
          <option value="">No work (e.g. a Scripture reference)</option>
          {works.map((w) => <option key={w.id} value={w.id}>{w.author ? `${w.author}: ` : ""}{w.title}</option>)}
        </select>
        <input name="ref" required placeholder="chapter, section or page" aria-label="Reference" className="w-44 rounded border border-border bg-bg px-2 py-1 text-sm" />
        <button className="rounded-full border border-border px-3 py-1 text-sm hover:border-accent">Add citation</button>
      </form>
    </div>
  );
}

function Editor({ subject }: { subject: string }) {
  const edits = useEdits();
  const state = useLoad(
    () => Promise.all([data.getBlocks(subject), data.listPeople(), data.listWorks()]),
    [subject],
  );
  useTitle(`Edit: ${subjectLabel(subject)}`);
  if (state.status === "loading") return <p className="mt-8 text-muted">Loading…</p>;
  if (state.status === "error") return <p role="alert" className="mt-8">{state.message}</p>;
  const [library, people, works] = state.value;
  const blocks = mergeBlocks(library, edits, subject);
  const hidden = library.filter((b) => edits[b.key]?.deleted);
  return (
    <>
      <ul className="mt-8 space-y-6">
        {blocks.map((b) => {
          const changed = Boolean(edits[b.key]);
          const original = library.find((x) => x.key === b.key);
          return (
            <li key={b.key} className="rounded-xl border border-border bg-surface p-4">
              <p className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                <TypeChip type={b.type as ContentType} by={b.by?.name} />
                <span className="text-muted">{SECTION_TITLES[b.section] ?? b.section}</span>
                <span className="text-muted">
                  {!original ? "Yours (this browser)" : changed ? "Library block, changed here" : b.author === "owner" ? "Library block" : "AI-drafted"}, {b.status}
                </span>
              </p>
              <BlockForm key={`${b.key}-${edits[b.key]?.updatedAt ?? ""}`} subject={subject} block={b} people={people} />
              <Citations subject={subject} block={b} works={works} />
              <p className="mt-3 flex justify-end gap-4 text-xs text-muted">
                {original && changed && (
                  <button type="button" className="underline" onClick={() => revertEdit(b.key)}>Undo my changes</button>
                )}
                <button type="button" className="underline" onClick={() => deleteEdit(b.key, subject, original ? asEdit(original, subject) : undefined)}>
                  {original ? "Hide this block" : "Delete this block"}
                </button>
              </p>
            </li>
          );
        })}
      </ul>

      {hidden.length > 0 && (
        <section className="mt-8 text-sm">
          <h2 className="font-semibold">Hidden library blocks</h2>
          <ul className="mt-2 space-y-1">
            {hidden.map((b) => (
              <li key={b.key}>
                {b.title ?? SECTION_TITLES[b.section] ?? b.section}{" "}
                <button type="button" className="text-muted underline" onClick={() => revertEdit(b.key)}>Show again</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10 rounded-xl border-2 border-dashed border-border p-4">
        <h2 className="mb-3 text-lg font-semibold">Add a block</h2>
        <BlockForm subject={subject} people={people} />
      </section>
    </>
  );
}

export function EditView() {
  const subject = useSearchParams().get("subject") ?? "";
  if (!SUBJECT.test(subject)) {
    return (
      <main className="mx-auto max-w-prose px-4 py-16">
        <h1 className="text-2xl font-semibold">Edit content</h1>
        <p className="mt-3 text-muted">
          {subject ? "That page address is not recognised. " : ""}
          Open any word, verse or library page and choose "Edit this page's content" in the My notes section.
        </p>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-4xl px-4 pb-24">
      <nav className="pt-6 text-sm"><Link href={subjectHref(subject)} className="text-muted hover:text-accent">‹ Back to {subjectLabel(subject)}</Link></nav>
      <h1 className="mt-4 text-3xl font-semibold">Edit: {subjectLabel(subject)}</h1>
      <p className="mt-2 max-w-prose text-muted">
        Your changes are saved in this browser and shown wherever this page appears here. Download a backup from{" "}
        <Link href="/notes/" className="underline">My notes</Link> to keep them or move them to another device. Mark citations as
        checked once you have confirmed them in the source.
      </p>
      <Editor subject={subject} />
    </main>
  );
}
