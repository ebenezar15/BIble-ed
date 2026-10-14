import type { Metadata } from "next";
import Link from "next/link";
import {
  addCitationAction, deleteBlockAction, deleteCitationAction, saveBlockAction, verifyCitationAction,
} from "@/app/actions";
import { TypeChip, type ContentType } from "@/components/ui/TypeChip";
import { SECTION_TITLES } from "@/components/content/Block";
import { BLOCK_SECTIONS, BLOCK_TYPES, CONSENSUS } from "@/lib/content/enums";
import { subjectHref, subjectLabel } from "@/lib/content/subject";
import { getBlocks, listPeople, type BlockView } from "@/lib/db/content";
import { listWorks } from "@/lib/db/edit";
import { isOwner } from "@/lib/owner";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit content" };

const TYPE_LABEL: Record<string, string> = {
  lexical_fact: "Lexical fact", historical_fact: "Historical fact", scholarly_interpretation: "Scholarly interpretation (named view)",
  lens_commentary: "Lens commentary (the app's view)", contested: "Contested", legal_reading_history: "How the legal reading arose",
};

const field = "w-full rounded border border-border bg-surface px-2 py-1";

function BlockForm({ subject, block, people }: { subject: string; block?: BlockView; people: { id: string; name: string }[] }) {
  return (
    <form action={saveBlockAction} className="space-y-3">
      <input type="hidden" name="subject" value={subject} />
      {block && <input type="hidden" name="id" value={block.id} />}
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
    </form>
  );
}

export default async function EditPage({ searchParams }: { searchParams: Promise<{ subject?: string }> }) {
  const { subject = "" } = await searchParams;
  if (!(await isOwner())) {
    return <main className="mx-auto max-w-prose px-4 py-16"><p>Sign in to edit.</p><Link href="/login?next=/edit" className="underline">Sign in</Link></main>;
  }
  const m = subject.match(/^(lemma|verse|entry|person):(.+)$/);
  if (!m) {
    return (
      <main className="mx-auto max-w-prose px-4 py-16">
        <h1 className="text-2xl font-semibold">Edit content</h1>
        <p className="mt-3 text-muted">Open any word, verse or library page and choose "Edit this page's content" in the My notes section.</p>
      </main>
    );
  }
  const [blocks, people, works] = await Promise.all([getBlocks(m[1], m[2]), listPeople(), listWorks()]);
  return (
    <main className="mx-auto max-w-4xl px-4 pb-24">
      <nav className="pt-6 text-sm"><Link href={subjectHref(subject)} className="text-muted hover:text-accent">‹ Back to {subjectLabel(subject)}</Link></nav>
      <h1 className="mt-4 text-3xl font-semibold">Edit: {subjectLabel(subject)}</h1>
      <p className="mt-2 max-w-prose text-muted">
        Your edits are marked as yours and are never overwritten when the library is re-imported. Mark citations as checked once
        you have confirmed them in the source.
      </p>

      <ul className="mt-8 space-y-6">
        {blocks.map((b) => (
          <li key={b.id} className="rounded-xl border border-border bg-surface p-4">
            <p className="mb-3 flex flex-wrap items-center gap-2 text-sm">
              <TypeChip type={b.type as ContentType} by={b.by?.name} />
              <span className="text-muted">{SECTION_TITLES[b.section] ?? b.section}</span>
              <span className="text-muted">{b.author === "owner" ? "Yours" : "AI-drafted"}, {b.status}</span>
            </p>
            <BlockForm subject={subject} block={b} people={people} />
            <div className="mt-4 border-t border-border pt-3">
              <p className="text-sm font-semibold">Citations</p>
              {b.needsSource && <p className="text-sm text-muted">Source needed: add a citation for this view.</p>}
              <ul className="mt-2 space-y-2 text-sm">
                {b.citations.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-2">
                    <span>{c.workTitle && <cite className="not-italic font-semibold">{c.workTitle}, </cite>}{c.ref}</span>
                    <form action={verifyCitationAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="verified" value={String(!c.verified)} />
                      <button className={`rounded-full border px-2 text-xs ${c.verified ? "border-accent text-accent" : "border-border text-muted"}`}>
                        {c.verified ? "Checked ✓ (undo)" : "Mark as checked"}
                      </button>
                    </form>
                    <form action={deleteCitationAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <button className="text-xs text-muted underline">Remove</button>
                    </form>
                  </li>
                ))}
              </ul>
              <form action={addCitationAction} className="mt-3 flex flex-wrap gap-2">
                <input type="hidden" name="blockId" value={b.id} />
                <select name="workId" aria-label="Work" className="min-w-0 flex-1 rounded border border-border bg-bg px-2 py-1 text-sm">
                  <option value="">No work (e.g. a Scripture reference)</option>
                  {works.map((w) => <option key={w.id} value={w.id}>{w.author ? `${w.author}: ` : ""}{w.title}</option>)}
                </select>
                <input name="ref" required placeholder="chapter, section or page" aria-label="Reference" className="w-44 rounded border border-border bg-bg px-2 py-1 text-sm" />
                <button className="rounded-full border border-border px-3 py-1 text-sm hover:border-accent">Add citation</button>
              </form>
            </div>
            <form action={deleteBlockAction} className="mt-3 text-right">
              <input type="hidden" name="id" value={b.id} />
              <button className="text-xs text-muted underline">Delete this block</button>
            </form>
          </li>
        ))}
      </ul>

      <section className="mt-10 rounded-xl border-2 border-dashed border-border p-4">
        <h2 className="mb-3 text-lg font-semibold">Add a block</h2>
        <BlockForm subject={subject} people={people} />
      </section>
    </main>
  );
}
