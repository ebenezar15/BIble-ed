import Link from "next/link";
import { notFound } from "next/navigation";
import { StudyCard } from "@/components/word/StudyCard";
import { formatRef } from "@/lib/books";
import { sanitizeLexicon } from "@/lib/db/lexhtml";
import { getName } from "@/lib/db/content";
import { safeDecode } from "@/lib/decode";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const decoded = safeDecode(id);
  const n = decoded ? await getName(decoded) : null;
  if (!n) notFound();
  return (
    <main className="mx-auto max-w-5xl px-4 pb-24">
      <nav className="pt-6 text-sm"><Link href="/names" className="text-muted hover:text-accent">‹ Names</Link></nav>
      <header className="py-8">
        <p className="text-sm capitalize text-muted">{n.kind}{n.gender ? `, ${n.gender.toLowerCase()}` : ""}</p>
        <h1 className="mt-1 text-5xl font-semibold tracking-tight">{n.name}</h1>
        {n.brief && <p className="mt-2 text-xl text-muted">{n.brief}</p>}
        <ul className="mt-4 flex flex-wrap gap-3">
          {n.lemmas.map((l) => (
            <li key={l.id}>
              <Link href={`/word/${l.id}`} className="flex items-baseline gap-2 rounded-full border border-border px-3 py-1 hover:border-accent">
                <span lang={l.language === "grc" ? "grc" : "he"} className={`text-2xl ${l.language === "grc" ? "text-greek" : "text-hebrew"}`}>{l.lemma}</span>
                <span className="text-sm italic text-muted">{l.translit}</span>
              </Link>
            </li>
          ))}
        </ul>
      </header>
      {n.lemmas.some((l) => l.meaning) && (
        <StudyCard title="What the name means" type="lexical_fact" source="STEPBible lexicons, CC BY 4.0." open>
          {n.lemmas.filter((l) => l.meaning).map((l) => (
            <div key={l.id} className="mb-3 max-w-prose leading-relaxed [&_a]:text-accent [&_a]:underline" dangerouslySetInnerHTML={{ __html: sanitizeLexicon(l.meaning!) }} />
          ))}
        </StudyCard>
      )}
      {(n.article || n.description) && (
        <StudyCard title="Who or what this is" type="historical_fact" source="STEPBible TIPNR, CC BY 4.0. STEP generated these descriptions with AI." open>
          <p className="max-w-prose leading-relaxed">{n.article ?? n.description}</p>
        </StudyCard>
      )}
      <StudyCard title={`Where the name appears (${n.refs.length})`} type="lexical_fact" source="STEPBible TIPNR, CC BY 4.0." open>
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
          {n.refs.slice(0, 300).map((r) => (
            <Link key={r} href={`/verse/${r}`} className="underline decoration-dotted">{formatRef(r)}</Link>
          ))}
        </p>
      </StudyCard>
    </main>
  );
}
