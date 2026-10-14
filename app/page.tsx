import Link from "next/link";
import { SearchBar } from "@/components/search/SearchBar";
import { formatRef } from "@/lib/books";
import { getVerse } from "@/lib/db/queries";
import { EXAMPLE_WORDS, verseForDay } from "@/lib/examples";

export const dynamic = "force-dynamic";

export default async function Home() {
  const osis = verseForDay(new Date());
  const verse = await getVerse(osis).catch(() => null);
  const text = verse?.translations.find((t) => t.id === "bsb") ?? verse?.translations[0];

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24">
      <section className="pt-14 pb-12 sm:pt-20">
        <h1 className="max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">
          Every word, in its own language
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted">
          Type an English word, Hebrew or Greek, a Strong's number or a verse. You'll see the original word, its root,
          its range of meaning, and every place it appears, read through Jesus, the clearest picture of the Father.
        </p>
        <div className="mt-8 max-w-2xl">
          <SearchBar large />
        </div>
        <p className="mt-3 text-sm text-muted">
          Press <kbd className="rounded border border-border px-1.5">/</kbd> anywhere to search.
        </p>
      </section>

      <section aria-labelledby="begin">
        <h2 id="begin" className="text-xl font-semibold">
          Begin with a word
        </h2>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {EXAMPLE_WORDS.map((w) => (
            <li key={w.id} data-example-word>
              <Link
                href={`/word/${w.id}`}
                aria-label={`${w.translit}: ${w.gloss}`}
                className="group flex h-full flex-col rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent focus-visible:border-accent"
              >
                <span
                  lang={w.lang}
                  dir={w.lang === "he" ? "rtl" : undefined}
                  className={`text-3xl leading-tight transition-transform duration-300 group-hover:-translate-y-0.5 motion-reduce:transform-none ${
                    w.lang === "he" ? "text-right text-hebrew" : "text-greek"
                  }`}
                >
                  {w.word}
                </span>
                <span className="mt-2 text-sm italic text-muted">{w.translit}</span>
                <span className="text-sm">{w.gloss}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {verse && text && (
        <section aria-labelledby="today" className="mt-14 border-t border-border pt-8">
          <h2 id="today" className="text-sm text-muted">
            A verse for today
          </h2>
          <blockquote className="mt-3 max-w-3xl text-2xl leading-snug sm:text-3xl">{text.text}</blockquote>
          <p className="mt-3 text-sm">
            <Link href={`/verse/${osis}`} className="font-semibold underline decoration-dotted underline-offset-4 hover:text-accent">
              {formatRef(osis)}
            </Link>{" "}
            <span className="text-muted">{text.name}. Open it to read word by word in {verse.language === "heb" ? "Hebrew" : "Greek"}.</span>
          </p>
        </section>
      )}
    </main>
  );
}
