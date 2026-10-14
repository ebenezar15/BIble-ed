"use client";

import { BOOKS } from "@/lib/books";

/** One bar per book of the canon, OT then NT; tap a bar to filter the concordance. */
export function Distribution({
  data,
  selected,
  onSelect,
}: {
  data: { book: string; count: number }[];
  selected: string | null;
  onSelect: (book: string | null) => void;
}) {
  const counts = new Map(data.map((d) => [d.book, d.count]));
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div>
      <div className="flex h-24 items-end gap-px" role="group" aria-label="Occurrences by book">
        {BOOKS.map((b) => {
          const n = counts.get(b.id) ?? 0;
          const active = selected === b.id;
          return (
            <button
              key={b.id}
              type="button"
              disabled={!n}
              title={`${b.name}: ${n}`}
              aria-label={`${b.name}, ${n} occurrences`}
              aria-pressed={active}
              onClick={() => onSelect(active ? null : b.id)}
              className={`relative h-full min-w-0 flex-1 ${b.id === "Mat" ? "ml-1.5" : ""} disabled:cursor-default`}
            >
              <span
                className={`absolute inset-x-0 bottom-0 rounded-t-sm ${active ? "bg-accent-2" : n ? "bg-accent" : "bg-surface-2"}`}
                style={{ height: n ? `${Math.max(6, (n / max) * 100)}%` : "2px" }}
              />
            </button>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted">
        <span>Genesis</span>
        <span>Malachi · Matthew</span>
        <span>Revelation</span>
      </div>
    </div>
  );
}
