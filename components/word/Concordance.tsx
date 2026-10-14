"use client";

import { verseHref } from "@/lib/href";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BOOK_BY_ID, formatRef } from "@/lib/books";
import { data } from "@/lib/data/browser";
import { cleanGloss, cleanSurface } from "@/lib/display";
import { Distribution } from "./Distribution";

type Row = { osis: string; surface: string; gloss: string; kjv: string };

export function Concordance({
  lemmaId,
  language,
  distribution,
  total,
}: {
  lemmaId: string;
  language: string;
  distribution: { book: string; count: number }[];
  total: number;
}) {
  const [book, setBook] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [count, setCount] = useState(total);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    data
      .getOccurrences(lemmaId, page, 50, book ?? undefined)
      .then((d) => {
        if (cancelled) return;
        setRows((prev) => (page === 0 ? d.rows : [...prev, ...d.rows]));
        setCount(d.total);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [lemmaId, page, book]);

  const lang = language === "grc" ? "grc" : "he";
  return (
    <div>
      <Distribution
        data={distribution}
        selected={book}
        onSelect={(b) => {
          setBook(b);
          setPage(0);
        }}
      />
      <p className="mt-4 text-sm text-muted" aria-live="polite">
        {book ? `${count} in ${BOOK_BY_ID.get(book)?.name}` : `${count.toLocaleString("en")} occurrences`}
        {book && (
          <button type="button" className="ml-2 underline" onClick={() => (setBook(null), setPage(0))}>
            Show all books
          </button>
        )}
      </p>
      <ol className="mt-2 divide-y divide-border">
        {rows.map((r, i) => (
          <li key={`${r.osis}-${i}`} data-concordance-row className="grid gap-1 py-3 sm:grid-cols-[8rem_1fr]">
            <span>
              <Link href={verseHref(r.osis)} className="font-semibold hover:text-accent">
                {formatRef(r.osis)}
              </Link>
              <span className="block text-sm">
                <span lang={lang} dir={lang === "he" ? "rtl" : undefined} className={lang === "he" ? "text-hebrew" : "text-greek"}>
                  {cleanSurface(r.surface)}
                </span>{" "}
                <span className="text-muted">{cleanGloss(r.gloss)}</span>
              </span>
            </span>
            <span className="text-sm leading-relaxed">{r.kjv}</span>
          </li>
        ))}
      </ol>
      {rows.length < count && (
        <button
          type="button"
          disabled={loading}
          onClick={() => setPage((p) => p + 1)}
          className="mt-3 rounded-full border border-border px-4 py-2 text-sm hover:border-accent disabled:opacity-50"
        >
          {loading ? "Loading…" : `Show more (${count - rows.length} left)`}
        </button>
      )}
    </div>
  );
}
