import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TypeChip } from "@/components/ui/TypeChip";
import { ChapterNav } from "@/components/verse/ChapterNav";
import { Interlinear } from "@/components/verse/Interlinear";
import { ParallelTranslations } from "@/components/verse/ParallelTranslations";
import { VerseGrid } from "@/components/verse/VerseGrid";
import { StudyCard } from "@/components/word/StudyCard";
import { formatRef } from "@/lib/books";
import { getVerse } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ osis: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { osis } = await params;
  return { title: formatRef(decodeURIComponent(osis)) };
}

export default async function VersePage({ params }: Props) {
  const { osis } = await params;
  const v = await getVerse(decodeURIComponent(osis));
  if (!v) notFound();
  const isHebrew = v.language === "heb";
  const ref = formatRef(v.osis);

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
        {[
          ["Cross-references", "Related passages"],
          ["Literary structure", "Chiasms, parallelism and inclusio, drawn as diagrams"],
          ["Cultural notes", "Background from the Ancient Near East, Second Temple Judaism and the Greco-Roman world"],
          ["Church Fathers", "What early Christian writers said on this verse"],
        ].map(([title, note]) => (
          <StudyCard key={title} title={title} type="awaiting">
            <p className="max-w-prose text-muted">
              {note}. Added in a later phase; nothing appears here until it has a source.
            </p>
          </StudyCard>
        ))}
      </div>
    </main>
  );
}
