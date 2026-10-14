import Link from "next/link";
import { NotesPanel } from "@/components/edit/NotesPanel";
import { notFound } from "next/navigation";
import { SECTION_TITLES } from "@/components/content/Block";
import { BlockSections } from "@/components/content/BlockSections";
import { StudyCard } from "@/components/word/StudyCard";
import { data } from "@/lib/data/server";
import { subjectHref, subjectLabel } from "@/lib/content/subject";
import { lifeDates } from "@/lib/format";

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await data.listPeople()).map((p) => ({ id: p.id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await data.getPerson(id);
  if (!p) notFound();
  const cited = p.cited;
  return (
    <main className="mx-auto max-w-5xl px-4 pb-24">
      <nav className="pt-6 text-sm"><Link href="/history/people" className="text-muted hover:text-accent">‹ People and their works</Link></nav>
      <header className="py-8">
        <p className="text-sm text-muted">{[p.era, p.tradition].filter(Boolean).join(" · ")}</p>
        <h1 className="mt-1 text-4xl font-semibold tracking-tight">{p.name}</h1>
        <p className="mt-1 text-muted">{lifeDates(p.born, p.died)}</p>
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
      <BlockSections subject={`person:${p.id}`} blocks={p.blocks} />
      {cited.length > 0 && (
        <StudyCard title={`Where ${p.name} is cited`}>
          <ul className="space-y-1 text-sm">
            {cited.map((c, i) => (
              <li key={i}>
                <Link className="underline decoration-dotted" href={subjectHref(`${c.kind}:${c.id}`)}>
                  {subjectLabel(`${c.kind}:${c.id}`)}
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
