import type { Metadata } from "next";
import Link from "next/link";
import { deleteNoteAction } from "@/app/actions";
import { PageIntro } from "@/components/content/EntryGrid";
import { renderMarkdown } from "@/lib/content/markdown";
import { subjectHref, subjectLabel } from "@/lib/content/subject";
import { listNotes } from "@/lib/db/edit";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My notes" };

export default async function NotesPage() {
  const notes = await listNotes();
  return (
    <main className="mx-auto max-w-5xl px-4 pb-24">
      <PageIntro title="My notes">
        Everything you've written, newest first. Add notes from any word, verse or library page.
      </PageIntro>
      <p className="mb-8 flex gap-3 text-sm">
        <a href="/api/notes/export?format=md" className="rounded-full border border-border px-4 py-2 hover:border-accent">Export as Markdown</a>
        <a href="/api/notes/export?format=json" className="rounded-full border border-border px-4 py-2 hover:border-accent">Export as JSON</a>
      </p>
      {!notes.length && <p className="text-muted">No notes yet. Open a word or verse and use the My notes section at the bottom.</p>}
      <ul className="space-y-4">
        {notes.map((n) => {
          const subject = `${n.subjectKind}:${n.subjectId}`;
          return (
            <li key={n.id} className="rounded-lg border border-border bg-surface p-4">
              <Link href={subjectHref(subject)} className="text-sm font-semibold text-accent underline">
                {subjectLabel(subject)}
              </Link>
              <div className="prose-block mt-2 max-w-prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(n.body) }} />
              <div className="mt-2 flex items-center gap-3 text-xs text-muted">
                {[n.workTitle, n.page].filter(Boolean).join(", ")}
                <span>{new Date(n.updatedAt).toLocaleDateString("en-GB")}</span>
                <form action={deleteNoteAction}>
                  <input type="hidden" name="id" value={n.id} />
                  <button className="underline">Delete</button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
