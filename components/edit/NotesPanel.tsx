"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { renderMarkdown } from "@/lib/content/markdown";
import { data } from "@/lib/data/browser";
import type { Work } from "@/lib/data/types";
import { editHref } from "@/lib/href";
import { addNote, deleteNote, useNotes } from "@/lib/local/store";

/** Notes on this word, verse or entry, kept in this browser. Excerpts from copyrighted books stay here, for personal use. */
export function NotesPanel({ subject }: { subject: string }) {
  const notes = useNotes().filter((n) => n.subject === subject);
  const [works, setWorks] = useState<Work[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    data.listWorks().then(setWorks, () => setWorks([]));
  }, []);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const workId = String(form.get("workId") ?? "");
    try {
      addNote({
        subject,
        body: String(form.get("body") ?? ""),
        workId,
        workTitle: works.find((w) => w.id === workId)?.title ?? null,
        page: String(form.get("page") ?? ""),
      });
      e.currentTarget.reset();
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <details className="group border-t border-border py-5" open>
      <summary className="flex cursor-pointer list-none items-center gap-3 md:pl-[12rem] [&::-webkit-details-marker]:hidden">
        <span aria-hidden className="inline-block w-4 text-xl leading-none text-accent transition-transform group-open:rotate-90">›</span>
        <h2 className="text-xl font-semibold">My notes ({notes.length})</h2>
        <Link href={editHref(subject)} className="ml-auto text-sm text-muted underline">
          Edit this page's content
        </Link>
      </summary>
      <div className="mt-4 md:pl-[12rem]">
        <p className="mb-3 text-xs text-muted">Saved in this browser only. Use My notes to export a backup.</p>
        <ul className="space-y-4">
          {notes.map((n) => (
            <li key={n.id} className="rounded-lg border border-border bg-surface p-3">
              <div className="prose-block max-w-prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(n.body) }} />
              {(n.workTitle || n.page) && (
                <p className="mt-1 text-xs text-muted">{[n.workTitle, n.page].filter(Boolean).join(", ")}</p>
              )}
              <button type="button" onClick={() => deleteNote(n.id)} className="mt-2 text-xs text-muted underline">
                Delete note
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={onSubmit} className="mt-4 space-y-2">
          <textarea name="body" required rows={3} placeholder="Your note, or an excerpt for personal study (Markdown works)"
            aria-label="New note" className="w-full rounded-lg border border-border bg-surface p-3" />
          <div className="flex flex-wrap gap-2">
            <select name="workId" aria-label="From a book (optional)" className="min-w-0 flex-1 rounded border border-border bg-surface px-2 py-1 text-sm">
              <option value="">Not from a book</option>
              {works.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.author ? `${w.author}: ` : ""}{w.title}
                </option>
              ))}
            </select>
            <input name="page" placeholder="Page" aria-label="Page" className="w-24 rounded border border-border bg-surface px-2 py-1 text-sm" />
            <button className="rounded-full bg-accent px-4 py-1 text-sm font-semibold text-bg">Save note</button>
          </div>
          {error && <p role="alert" className="text-sm text-hebrew">{error}</p>}
        </form>
      </div>
    </details>
  );
}
