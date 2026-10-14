import Link from "next/link";
import { NotesPanel } from "@/components/edit/NotesPanel";
import { notFound } from "next/navigation";
import { BlockList, groupBySection, SECTION_TITLES } from "@/components/content/Block";
import { StudyCard } from "@/components/word/StudyCard";
import { KIND_LABEL } from "@/lib/content/routes";
import { getEntry } from "@/lib/db/content";
import { EntryData, RefList } from "./EntryData";

export async function EntryPage({
  kind,
  slug,
  back,
  children,
}: {
  kind: string;
  slug: string;
  back: { href: string; label: string };
  children?: React.ReactNode;
}) {
  const entry = await getEntry(kind, decodeURIComponent(slug));
  if (!entry) notFound();
  const sections = groupBySection(entry.blocks);
  return (
    <main className="mx-auto max-w-5xl px-4 pb-24">
      <nav className="pt-6 text-sm">
        <Link href={back.href} className="text-muted hover:text-accent">
          ‹ {back.label}
        </Link>
      </nav>
      <header className="py-8">
        <p className="text-sm text-muted">{KIND_LABEL[kind] ?? kind}</p>
        <h1 className="mt-1 text-4xl font-semibold tracking-tight sm:text-5xl">{entry.title}</h1>
        {entry.subtitle && <p className="mt-2 text-xl text-muted">{entry.subtitle}</p>}
        {entry.summary && <p className="mt-4 max-w-prose text-lg leading-relaxed">{entry.summary}</p>}
        {entry.refs.length > 0 && (
          <p className="mt-4 text-sm">
            <span className="mr-2 text-muted">Read:</span>
            <RefList refs={entry.refs} />
          </p>
        )}
        {entry.lemmas.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {entry.lemmas.map((l) => (
              <li key={l.id}>
                <Link href={`/word/${l.id}`} className="flex items-baseline gap-2 rounded-full border border-border px-3 py-1 hover:border-accent">
                  <span lang={l.language === "grc" ? "grc" : "he"} className={l.language === "grc" ? "text-greek" : "text-hebrew"}>
                    {l.lemma}
                  </span>
                  <span className="text-sm">{l.gloss}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </header>
      <section className="mb-8">
        <EntryData kind={kind} data={entry.data} />
      </section>
      {children}
      {sections.map(([section, items]) => (
        <StudyCard key={section} title={SECTION_TITLES[section] ?? section} open>
          <BlockList blocks={items} />
        </StudyCard>
      ))}
      {!sections.length && (
        <p className="border-t border-border pt-6 text-muted">No commentary has been written for this entry yet.</p>
      )}
      <NotesPanel subject={`entry:${kind}/${entry.slug}`} />
    </main>
  );
}
