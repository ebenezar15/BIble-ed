"use client";

import Link from "next/link";
import { formatRef } from "@/lib/books";
import { data } from "@/lib/data/browser";
import { useLoad } from "@/lib/data/use";
import { verseForDay } from "@/lib/examples";
import { verseHref } from "@/lib/href";

/** A verse for today, chosen in the reader's browser so it changes daily on a static site. */
export function VerseOfDay() {
  const state = useLoad(async () => {
    const osis = verseForDay(new Date());
    return { osis, verse: await data.getVerse(osis) };
  }, []);
  if (state.status !== "ready" || !state.value.verse) return null;
  const { osis, verse } = state.value;
  const text = verse.translations.find((t) => t.id === "bsb") ?? verse.translations[0];
  if (!text) return null;
  return (
    <section aria-labelledby="today" className="mt-14 border-t border-border pt-8">
      <h2 id="today" className="text-sm text-muted">
        A verse for today
      </h2>
      <blockquote className="mt-3 max-w-3xl text-2xl leading-snug sm:text-3xl">{text.text}</blockquote>
      <p className="mt-3 text-sm">
        <Link href={verseHref(osis)} className="font-semibold underline decoration-dotted underline-offset-4 hover:text-accent">
          {formatRef(osis)}
        </Link>{" "}
        <span className="text-muted">{text.name}. Open it to read word by word in {verse.language === "heb" ? "Hebrew" : "Greek"}.</span>
      </p>
    </section>
  );
}
