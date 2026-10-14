import { verseHref } from "@/lib/href";
import Link from "next/link";

/** Jump to any verse in this chapter, or any chapter in this book. */
export function VerseGrid({
  book,
  bookName,
  chapter,
  verse,
  chapters,
  verses,
}: {
  book: string;
  bookName: string;
  chapter: number;
  verse: number;
  chapters: number;
  verses: number;
}) {
  const cell = "flex h-9 items-center justify-center rounded text-sm tabular-nums hover:bg-surface-2";
  return (
    <details className="group mt-4 rounded-lg border border-border bg-surface">
      <summary className="cursor-pointer px-4 py-2 text-sm text-muted">
        Go to another verse in {bookName}
      </summary>
      <div className="px-4 pb-4">
        <p className="mt-2 text-sm font-semibold">Chapter {chapter}</p>
        <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(2.25rem,1fr))] gap-1">
          {Array.from({ length: verses }, (_, i) => i + 1).map((v) => (
            <Link
              key={v}
              href={verseHref(`${book}.${chapter}.${v}`)}
              aria-current={v === verse ? "page" : undefined}
              className={`${cell} ${v === verse ? "bg-accent text-bg hover:bg-accent" : ""}`}
            >
              {v}
            </Link>
          ))}
        </div>
        {chapters > 1 && (
          <>
            <p className="mt-4 text-sm font-semibold">Chapters</p>
            <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(2.25rem,1fr))] gap-1">
              {Array.from({ length: chapters }, (_, i) => i + 1).map((c) => (
                <Link
                  key={c}
                  href={verseHref(`${book}.${c}.1`)}
                  aria-current={c === chapter ? "page" : undefined}
                  className={`${cell} ${c === chapter ? "border border-accent" : ""}`}
                >
                  {c}
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </details>
  );
}
