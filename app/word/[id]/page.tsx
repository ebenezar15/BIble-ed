import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Concordance } from "@/components/word/Concordance";
import { GlossBars } from "@/components/word/GlossBars";
import { RootTree } from "@/components/word/RootTree";
import { StudyCard } from "@/components/word/StudyCard";
import { getLemma, type LemmaRef } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

const LANGUAGE = { heb: "Hebrew", arc: "Aramaic", grc: "Greek" } as const;

const POS: Record<string, string> = {
  N: "Noun", V: "Verb", A: "Adjective", Adv: "Adverb", Prep: "Preposition", Conj: "Conjunction",
  Pron: "Pronoun", Part: "Particle", Intj: "Interjection", "N-M": "Noun, masculine", "N-F": "Noun, feminine",
  "N-M-P": "Proper name (person)", "N-F-P": "Proper name (person)", "N-M-L": "Proper name (place)",
  "N-LI": "Letter", "N-PRI": "Proper name", "N-M-T": "Title",
};

function posLabel(pos: string): string {
  return POS[pos] ?? POS[pos.split("-")[0]] ?? pos;
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const l = await getLemma(id.toUpperCase());
  return { title: l ? `${l.lemma} ${l.translit} (${l.gloss})` : "Word not found" };
}

const PENDING = [
  { title: "Culture and background", note: "Ancient Near Eastern, Second Temple and Greco-Roman usage" },
  { title: "Translation history", note: "How the Septuagint, Vulgate, Luther, Tyndale, KJV and modern versions rendered it, and why" },
  { title: "Relational reading", note: "The app's lens commentary, with the legal reading's history where relevant" },
  { title: "Voices", note: "Named teachers' interpretations, each with a verified citation" },
  { title: "Church Fathers", note: "How early Christian writers used the word" },
];

export default async function WordPage({ params }: Props) {
  const { id: raw } = await params;
  const id = decodeURIComponent(raw).toUpperCase();
  if (id !== raw) redirect(`/word/${id}`);
  const word = await getLemma(id);
  if (!word) notFound();

  const isHebrew = word.language !== "grc";
  const lang = isHebrew ? "he" : "grc";
  const asRef: LemmaRef = {
    id: word.id,
    lemma: word.lemma,
    translit: word.translit,
    gloss: word.gloss,
    language: word.language,
    count: word.count,
  };
  const lexSource = word.lexicon[0];

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24">
      <header className="py-10 md:grid md:grid-cols-[10rem_1fr] md:gap-x-8">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 text-sm text-muted md:block md:pt-6 [&_dd]:text-ink md:[&_dd]:mb-2">
          <dt>Language</dt>
          <dd>{LANGUAGE[word.language as keyof typeof LANGUAGE]}</dd>
          {word.pos && (
            <>
              <dt>Part of speech</dt>
              <dd>{posLabel(word.pos)}</dd>
            </>
          )}
          <dt>Strong's (STEP)</dt>
          <dd className="tabular-nums">{word.id}</dd>
        </dl>
        <div>
          <h1 className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <span
              lang={lang}
              dir={isHebrew ? "rtl" : undefined}
              className={`text-7xl leading-none md:text-8xl ${isHebrew ? "text-hebrew" : "text-greek"}`}
            >
              {word.lemma}
            </span>
            <span className="text-2xl italic text-muted">{word.translit}</span>
          </h1>
          <p className="mt-4 text-2xl font-semibold">{word.gloss}</p>
          <p className="mt-1 text-muted">
            {word.count.toLocaleString("en")} {word.count === 1 ? "occurrence" : "occurrences"}
          </p>
          {word.senses.length > 0 && (
            <p className="mt-4 text-sm">
              <span className="text-muted">Other senses of {word.strongs}: </span>
              {word.senses.map((s, i) => (
                <span key={s.id}>
                  {i > 0 && ", "}
                  <Link href={`/word/${s.id}`} className="underline decoration-dotted underline-offset-4 hover:text-accent">
                    {s.gloss} ({s.id})
                  </Link>
                </span>
              ))}
            </p>
          )}
        </div>
      </header>

      <StudyCard
        title="Meaning"
        type="lexical_fact"
        open
        source={lexSource ? <>{isHebrew ? "STEPBible TBESH (abridged BDB)" : "STEPBible TBESG (Abbott-Smith)"}, CC BY 4.0.</> : undefined}
      >
        {word.lexicon.length ? (
          word.lexicon.map((e) => (
            <div
              key={e.sourceId}
              className="lexicon max-w-prose leading-relaxed [&_a]:text-accent [&_a]:underline [&_a]:decoration-dotted"
              dangerouslySetInnerHTML={{ __html: e.html }}
            />
          ))
        ) : (
          <p className="text-muted">No lexicon entry for this word yet.</p>
        )}
      </StudyCard>

      {word.root && (
        <StudyCard
          title="Root and word family"
          type="lexical_fact"
          open
          source="Open Scriptures Hebrew Lexicon, CC BY 4.0."
        >
          <RootTree letters={word.root.letters} gloss={word.root.gloss} current={asRef} family={word.root.family} />
        </StudyCard>
      )}

      <StudyCard
        title="How it's translated"
        type="lexical_fact"
        open
        source={isHebrew ? "STEPBible TAHOT glosses, CC BY 4.0." : "STEPBible TAGNT glosses, CC BY 4.0."}
      >
        <p className="mb-4 max-w-prose text-sm text-muted">
          The English glosses given for each occurrence, most frequent first.
        </p>
        <GlossBars glosses={word.glosses} total={word.count} />
      </StudyCard>

      <StudyCard title="Where it appears" type="lexical_fact" source={isHebrew ? "Leningrad Codex via STEPBible; KJV." : "SBLGNT via STEPBible; KJV."}>
        <Concordance lemmaId={word.id} language={word.language} distribution={word.distribution} total={word.count} />
      </StudyCard>

      {PENDING.map((p) => (
        <StudyCard key={p.title} title={p.title} type="awaiting">
          <p className="max-w-prose text-muted">
            {p.note}. This section is part of the content framework in the next phase. Nothing will appear here until it
            has a source.
          </p>
        </StudyCard>
      ))}
    </main>
  );
}
