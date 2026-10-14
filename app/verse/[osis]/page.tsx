import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TypeChip } from "@/components/ui/TypeChip";
import { ChapterNav } from "@/components/verse/ChapterNav";
import { Interlinear } from "@/components/verse/Interlinear";
import { ParallelTranslations } from "@/components/verse/ParallelTranslations";
import { VerseGrid } from "@/components/verse/VerseGrid";
import { StudyCard } from "@/components/word/StudyCard";
import { formatRef } from "@/lib/books";
import { safeDecode } from "@/lib/decode";
import { getVerse } from "@/lib/db/queries";
import { BlockList, groupBySection, SECTION_TITLES } from "@/components/content/Block";
import { entriesForVerse, getBlocks, getCrossRefs, getFatherComments } from "@/lib/db/content";
import Link from "next/link";
import { NotesPanel } from "@/components/edit/NotesPanel";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ osis: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { osis } = await params;
  return { title: formatRef(safeDecode(osis) ?? osis) };
}

export default async function VersePage({ params }: Props) {
  const { osis } = await params;
  const decoded = safeDecode(osis);
  const v = decoded ? await getVerse(decoded) : null;
  if (!v) notFound();
  const isHebrew = v.language === "heb";
  const ref = formatRef(v.osis);
  const [xrefs, fathers, related, blocks] = await Promise.all([
    getCrossRefs(v.osis),
    getFatherComments(v.osis),
    entriesForVerse(v.osis),
    getBlocks("verse", v.osis),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24">
      <header className="flex flex-wrap items-end justify-between gap-4 pt-10 pb-6">
        <div>
          <p className="text-sm text-muted">{isHebrew ? "Hebrew Bible" : "New Testament"}</p>
          <h1 className="text-4xl font-semibold tracking-tight">{ref}</h1>
        </div>
        <ChapterNav prev={v.prev} next={v.next} />
      </header>

      {v.hebRef && (
        <p className="mb-6 rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm">
          Hebrew numbering: {formatRef(v.hebRef)}. English Bibles number this verse differently.
        </p>
      )}
      {v.textNote === "not-in-sblgnt" && (
        <div className="mb-6 rounded-lg border border-dashed border-muted px-4 py-3 text-sm">
          <TypeChip type="contested" />
          <p className="mt-2 max-w-prose">
            Not in the SBL Greek New Testament. This verse comes from later manuscripts (the Textus Receptus behind the
            KJV), so several modern translations leave it out or put it in a footnote.
          </p>
        </div>
      )}
      {v.textNote === "na28-fallback" && (
        <div className="mb-6 rounded-lg border border-dashed border-muted px-4 py-3 text-sm">
          <TypeChip type="contested" />
          <p className="mt-2 max-w-prose">
            A disputed passage. Critical editions print it in brackets because the earliest manuscripts lack it. The Greek
            shown follows NA28, because the STEPBible data does not mark these words as SBLGNT.
          </p>
        </div>
      )}

      {v.tokens.length > 0 && (
        <section aria-labelledby="original" className="rounded-2xl border border-border bg-surface p-4 sm:p-6">
          <h2 id="original" className="mb-3 text-sm text-muted">
            {isHebrew ? "Hebrew (Leningrad Codex)" : "Greek (SBLGNT)"}: tap or hover a word
          </h2>
          <Interlinear tokens={v.tokens} language={v.language} />
          <p className="mt-6 text-xs text-muted">
            Text, glosses and grammar: STEPBible {isHebrew ? "TAHOT" : "TAGNT"}, CC BY 4.0.
          </p>
        </section>
      )}

      <section aria-labelledby="english" className="mt-10">
        <h2 id="english" className="mb-3 text-xl font-semibold">
          English translations
        </h2>
        <ParallelTranslations translations={v.translations} />
      </section>

      <VerseGrid
        book={v.book}
        bookName={v.bookName}
        chapter={v.chapter}
        verse={v.verse}
        chapters={v.bookChapters}
        verses={v.chapterVerses}
      />

      <div className="mt-10">
        {related.length > 0 && (
          <StudyCard title="Where this verse belongs" open>
            <ul className="space-y-3">
              {related.map((r) => (
                <li key={`${r.kind}/${r.slug}`}>
                  <span className="text-xs text-muted">{r.label}</span>
                  <Link href={r.href} className="block font-semibold hover:text-accent">
                    {r.title}
                  </Link>
                  {r.summary && <p className="max-w-prose text-sm text-muted">{r.summary}</p>}
                </li>
              ))}
            </ul>
          </StudyCard>
        )}

        {groupBySection(blocks).map(([section, items]) => (
          <StudyCard key={section} title={SECTION_TITLES[section] ?? section} open>
            <BlockList blocks={items} />
          </StudyCard>
        ))}

        <StudyCard
          title={`Cross-references (${xrefs.length})`}
          type="lexical_fact"
          source="OpenBible.info, CC BY. Ranked by reader votes."
          open={xrefs.length > 0}
        >
          {xrefs.length ? (
            <ol className="divide-y divide-border">
              {xrefs.map((x) => (
                <li key={`${x.start}-${x.end}`} className="py-2">
                  <Link href={`/verse/${x.start}`} className="font-semibold hover:text-accent">
                    {formatRef(x.start)}
                    {x.end !== x.start && `–${x.end.split(".").slice(x.end.split(".")[1] === x.start.split(".")[1] ? 2 : 1).join(":")}`}
                  </Link>
                  {x.text && <p className="max-w-prose text-sm text-muted">{x.text}</p>}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-muted">No cross-references recorded for this verse.</p>
          )}
        </StudyCard>

        <StudyCard
          title={`Church Fathers on this verse (${fathers.length})`}
          type="historical_fact"
          source="Public-domain translations (ANF/NPNF, Catena Aurea) via HistoricalChristianFaith."
        >
          {fathers.length ? (
            <ul className="space-y-5">
              {fathers.map((f) => (
                <li key={f.id}>
                  <p className="text-sm font-semibold">
                    {f.father}
                    {f.year && <span className="font-normal text-muted"> (c. AD {f.year})</span>}
                  </p>
                  <blockquote className="mt-1 max-w-prose whitespace-pre-line border-l-2 border-border pl-3 leading-relaxed">
                    {f.quote.length > 1400 ? `${f.quote.slice(0, 1400)}…` : f.quote}
                  </blockquote>
                  {f.sourceTitle && (
                    <p className="mt-1 text-xs text-muted">
                      {f.sourceUrl ? (
                        <a href={f.sourceUrl} className="underline" rel="noreferrer">
                          {f.sourceTitle}
                        </a>
                      ) : (
                        f.sourceTitle
                      )}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">No public-domain patristic comment is recorded on this verse.</p>
          )}
        </StudyCard>
      </div>
      <NotesPanel subject={`verse:${v.osis}`} />
    </main>
  );
}
