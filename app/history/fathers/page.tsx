import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/content/EntryGrid";
import { formatRef } from "@/lib/books";
import { sql } from "@/lib/db/client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Search the Fathers" };

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const rows = q.trim()
    ? await sql<{ id: number; father: string; year: number | null; osis: string; snippet: string; source_title: string | null }[]>`
        select c.id, c.father, c.year, v.osis, c.source_title,
          ts_headline('english', c.quote, websearch_to_tsquery('english', ${q}),
            'StartSel=' || chr(1) || ',StopSel=' || chr(2) || ',MaxWords=40,MinWords=20') as snippet
        from father_comment c join verse v on v.id = c.verse_start
        where to_tsvector('english', c.quote) @@ websearch_to_tsquery('english', ${q})
        order by ts_rank(to_tsvector('english', c.quote), websearch_to_tsquery('english', ${q})) desc limit 40`
    : [];
  const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from father_comment`;
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\u0001/g, "<mark>").replace(/\u0002/g, "</mark>");
  return (
    <main className="mx-auto max-w-5xl px-4 pb-24">
      <PageIntro title="Search the Fathers">
        {n.toLocaleString("en")} comments on Scripture from the early church and medieval writers, in public-domain translations
        (Ante-Nicene and Nicene Fathers, Newman's Catena Aurea).
      </PageIntro>
      <form className="mb-8 flex max-w-xl gap-2">
        <input name="q" defaultValue={q} placeholder="recapitulation, ransom, adoption…" className="w-full rounded-full border border-border bg-surface px-4 py-2" />
        <button className="rounded-full bg-accent px-4 py-2 font-semibold text-bg">Search</button>
      </form>
      <ul className="space-y-6">
        {rows.map((r) => (
          <li key={r.id}>
            <p className="text-sm">
              <span className="font-semibold">{r.father}</span>
              {r.year && <span className="text-muted"> (c. AD {r.year})</span>} on{" "}
              <Link href={`/verse/${r.osis}`} className="underline">{formatRef(r.osis)}</Link>
            </p>
            <p className="mt-1 max-w-prose leading-relaxed [&_mark]:bg-accent/20 [&_mark]:text-ink" dangerouslySetInnerHTML={{ __html: esc(r.snippet) }} />
            {r.source_title && <p className="text-xs text-muted">{r.source_title}</p>}
          </li>
        ))}
      </ul>
      {q && !rows.length && <p className="text-muted">No comments matched. Try a simpler word.</p>}
    </main>
  );
}
