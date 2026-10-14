import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/content/EntryGrid";
import { searchNames } from "@/lib/db/content";
import { sql } from "@/lib/db/client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Names" };

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const rows = q.trim()
    ? await searchNames(q)
    : await sql<{ id: string; name: string; kind: string; brief: string | null; refCount: number }[]>`
        select id, name, kind, brief, ref_count as "refCount" from name_entry order by ref_count desc limit 60`;
  return (
    <main className="mx-auto max-w-5xl px-4 pb-24">
      <PageIntro title="Names">Every person and place named in the Bible, with the Hebrew or Greek behind the name and where it appears.</PageIntro>
      <form className="mb-8 flex max-w-xl gap-2">
        <input name="q" defaultValue={q} placeholder="Abraham, Bethlehem, Melchizedek…" className="w-full rounded-full border border-border bg-surface px-4 py-2" />
        <button className="rounded-full bg-accent px-4 py-2 font-semibold text-bg">Find</button>
      </form>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((n) => (
          <li key={n.id}>
            <Link href={`/names/${encodeURIComponent(n.id)}`} className="block h-full rounded-lg border border-border bg-surface p-3 hover:border-accent">
              <span className="font-semibold">{n.name}</span>
              <span className="ml-2 text-xs text-muted">{n.kind}, {n.refCount} refs</span>
              {n.brief && <span className="block text-sm">{n.brief}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
