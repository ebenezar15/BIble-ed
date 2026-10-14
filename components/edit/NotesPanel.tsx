import Link from "next/link";
import { addNoteAction, deleteNoteAction } from "@/app/actions";
import { renderMarkdown } from "@/lib/content/markdown";
import { listNotes, listWorks } from "@/lib/db/edit";
import { isOwner } from "@/lib/owner";

/** Private notes on this word, verse or entry. Excerpts from copyrighted books stay here, for personal use only. */
export async function NotesPanel({ subject }: { subject: string }) {
  if (!(await isOwner())) return null;
  const [notes, works] = await Promise.all([listNotes(subject), listWorks()]);
  return (
    <details className="group border-t border-border py-5" open={notes.length > 0}>
      <summary className="flex cursor-pointer list-none items-center gap-3 md:pl-[12rem] [&::-webkit-details-marker]:hidden">
        <span aria-hidden className="inline-block w-4 text-xl leading-none text-accent transition-transform group-open:rotate-90">›</span>
        <h2 className="text-xl font-semibold">My notes ({notes.length})</h2>
        <Link href={`/edit?subject=${encodeURIComponent(subject)}`} className="ml-auto text-sm text-muted underline">
          Edit this page's content
        </Link>
      </summary>
      <div className="mt-4 md:pl-[12rem]">
        <ul className="space-y-4">
          {notes.map((n) => (
            <li key={n.id} className="rounded-lg border border-border bg-surface p-3">
              <div className="prose-block max-w-prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(n.body) }} />
              {(n.workTitle || n.page) && (
                <p className="mt-1 text-xs text-muted">{[n.workTitle, n.page].filter(Boolean).join(", ")}</p>
              )}
              <form action={deleteNoteAction} className="mt-2">
                <input type="hidden" name="id" value={n.id} />
                <input type="hidden" name="subject" value={subject} />
                <button className="text-xs text-muted underline">Delete note</button>
              </form>
            </li>
          ))}
        </ul>
        <form action={addNoteAction} className="mt-4 space-y-2">
          <input type="hidden" name="subject" value={subject} />
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
        </form>
      </div>
    </details>
  );
}
