import Link from "next/link";
import { NotesPanel } from "@/components/edit/NotesPanel";
import { notFound } from "next/navigation";
import { BlockList, groupBySection, SECTION_TITLES } from "@/components/content/Block";
import { StudyCard } from "@/components/word/StudyCard";
import { getPerson } from "@/lib/db/content";
import { sql } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getPerson(id);
  if (!p) notFound();
  const cited = await sql<{ kind: string; id: string; section: string }[]>`
    select subject_kind as kind, subject_id as id, section from content_block where by_person = ${id} limit 60`;
  return (
    <main className="mx-auto max-w-5xl px-4 pb-24">
      <nav className="pt-6 text-sm"><Link href="/history/people" className="text-muted hover:text-accent">‹ People and their works</Link></nav>
      <header className="py-8">
        <p className="text-sm text-muted">{[p.era, p.tradition].filter(Boolean).join(" · ")}</p>
        <h1 className="mt-1 text-4xl font-semibold tracking-tight">{p.name}</h1>
        <p className="mt-1 text-muted">{[p.born && `born c. ${p.born}`, p.died && `died ${p.died}`].filter(Boolean).join(", ")}</p>
        {p.summary && <p className="mt-4 max-w-prose text-lg">{p.summary}</p>}
      </header>
      {p.works.length > 0 && (
        <StudyCard title="Works" open>
          <ul className="space-y-2">
            {p.works.map((w) => (
              <li key={w.id}>
                <cite className="font-semibold not-italic">{w.title}</cite>
                <span className="ml-2 text-sm text-muted">
                  {[w.year, w.edition, w.publisher, w.isbn && `ISBN ${w.isbn}`].filter(Boolean).join(", ")}
                </span>
                <span className="ml-2 rounded-full border border-border px-2 text-xs text-muted">
                  {w.copyright === "public_domain" ? "Public domain" : "In copyright: referenced, not reproduced"}
                </span>
              </li>
            ))}
          </ul>
        </StudyCard>
      )}
      {groupBySection(p.blocks).map(([section, items]) => (
        <StudyCard key={section} title={SECTION_TITLES[section] ?? section} open>
          <BlockList blocks={items} />
        </StudyCard>
      ))}
      {cited.length > 0 && (
        <StudyCard title={`Where ${p.name} is cited`}>
          <ul className="space-y-1 text-sm">
            {cited.map((c, i) => (
              <li key={i}>
                <Link className="underline decoration-dotted" href={c.kind === "lemma" ? `/word/${c.id}` : c.kind === "verse" ? `/verse/${c.id}` : `/search?q=${encodeURIComponent(c.id.split("/").pop() ?? "")}`}>
                  {c.id}
                </Link>{" "}
                <span className="text-muted">({SECTION_TITLES[c.section] ?? c.section})</span>
              </li>
            ))}
          </ul>
        </StudyCard>
      )}
      <NotesPanel subject={`person:${p.id}`} />
    </main>
  );
}
