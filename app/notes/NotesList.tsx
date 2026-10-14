"use client";

import Link from "next/link";
import { useState } from "react";
import { renderMarkdown } from "@/lib/content/markdown";
import { subjectHref, subjectLabel } from "@/lib/content/subject";
import {
  deleteNote, download, exportBackup, importBackup, notesToMarkdown, useEdits, useNotes,
} from "@/lib/local/store";

const button = "rounded-full border border-border px-4 py-2 hover:border-accent";

export function NotesList() {
  const notes = useNotes();
  const edits = Object.values(useEdits());
  const [message, setMessage] = useState<string | null>(null);
  const date = new Date().toISOString().slice(0, 10);

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const counts = importBackup(JSON.parse(await file.text()));
      setMessage(`Restored ${counts.notes} notes and ${counts.edits} content edits.`);
    } catch (err) {
      setMessage((err as Error).message || "That file could not be read.");
    }
  }

  return (
    <>
      <div className="mb-8 rounded-xl border border-border bg-surface-2 p-4 text-sm">
        <p className="max-w-prose">
          Notes and content edits are saved in this browser on this device. Download a backup now and then, and restore it
          to move them to another browser or device.
        </p>
        <p className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={button} onClick={() => download(`logos-backup-${date}.json`, JSON.stringify(exportBackup(), null, 2), "application/json")}>
            Download backup
          </button>
          <label className={`${button} cursor-pointer`}>
            Restore a backup
            <input type="file" accept="application/json,.json" onChange={onImport} className="sr-only" />
          </label>
          <button type="button" className={button} disabled={!notes.length}
            onClick={() => download(`logos-notes-${date}.md`, notesToMarkdown(notes, subjectLabel), "text/markdown")}>
            Export notes as Markdown
          </button>
        </p>
        {message && <p role="status" className="mt-3">{message}</p>}
        {edits.length > 0 && <p className="mt-3 text-muted">This browser also holds {edits.length} content edit{edits.length === 1 ? "" : "s"}; the backup includes them.</p>}
      </div>
      {!notes.length && <p className="text-muted">No notes yet. Open a word or verse and use the My notes section at the bottom.</p>}
      <ul className="space-y-4">
        {notes.map((n) => (
          <li key={n.id} className="rounded-lg border border-border bg-surface p-4">
            <Link href={subjectHref(n.subject)} className="text-sm font-semibold text-accent underline">
              {subjectLabel(n.subject)}
            </Link>
            <div className="prose-block mt-2 max-w-prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(n.body) }} />
            <div className="mt-2 flex items-center gap-3 text-xs text-muted">
              {[n.workTitle, n.page].filter(Boolean).join(", ")}
              <span>{new Date(n.updatedAt).toLocaleDateString("en-GB")}</span>
              <button type="button" className="underline" onClick={() => deleteNote(n.id)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
