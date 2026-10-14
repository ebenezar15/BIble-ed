"use client";

import { useMemo, useState } from "react";

export type TimelineEvent = { slug: string; title: string; summary: string | null; year: number; endYear?: number | null; category: string };

const fmt = (y: number) => (y < 0 ? `${-y} BC` : `AD ${y}`);

/** Church history from the apostles to today: filter by kind of event, jump by century. */
export function Timeline({ events }: { events: TimelineEvent[] }) {
  const categories = useMemo(() => [...new Set(events.map((e) => e.category))].sort(), [events]);
  const [active, setActive] = useState<Set<string>>(new Set());
  const shown = events.filter((e) => !active.size || active.has(e.category)).sort((a, b) => a.year - b.year);
  const centuries = [...new Set(shown.map((e) => Math.floor(e.year / 100)))];
  const counts = centuries.map((c) => shown.filter((e) => Math.floor(e.year / 100) === c).length);
  const max = Math.max(...counts, 1);
  const toggle = (c: string) => {
    const next = new Set(active);
    if (next.has(c)) next.delete(c);
    else next.add(c);
    setActive(next);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter events">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={active.has(c)}
            onClick={() => toggle(c)}
            className={`rounded-full border px-3 py-1 text-sm capitalize ${active.has(c) ? "border-accent bg-accent text-bg" : "border-border"}`}
          >
            {c}
          </button>
        ))}
        {active.size > 0 && (
          <button type="button" onClick={() => setActive(new Set())} className="px-2 text-sm underline">
            Show all
          </button>
        )}
      </div>

      <nav aria-label="Jump to century" className="sticky top-14 z-10 mt-6 flex h-16 items-end gap-0.5 bg-bg/90 py-1 backdrop-blur">
        {centuries.map((c, i) => (
          <a
            key={c}
            href={`#c${c}`}
            title={`${c < 0 ? `${-c}th century BC` : `${c + 1}th century`}: ${counts[i]} events`}
            className="group relative flex h-full flex-1 items-end"
          >
            <span className="w-full rounded-t-sm bg-accent/70 group-hover:bg-accent" style={{ height: `${(counts[i] / max) * 100}%` }} />
          </a>
        ))}
      </nav>

      <ol className="mt-6 border-l-2 border-border">
        {centuries.map((c) => (
          <li key={c} id={`c${c}`} className="scroll-mt-32">
            <h2 className="-ml-px border-l-2 border-accent pl-4 pt-4 text-sm font-semibold text-muted">
              {c < 0 ? `${-c * 100} BC` : c === 0 ? "First century" : `${c + 1}${["st", "nd", "rd"][((c + 1) % 10) - 1] && ![11, 12, 13].includes(c + 1) ? ["st", "nd", "rd"][((c + 1) % 10) - 1] : "th"} century`}
            </h2>
            <ul>
              {shown
                .filter((e) => Math.floor(e.year / 100) === c)
                .map((e) => (
                  <li key={e.slug} id={e.slug} className="relative scroll-mt-32 py-3 pl-6">
                    <span className="absolute -left-[7px] top-5 size-3 rounded-full border-2 border-bg bg-accent-2" aria-hidden />
                    <p className="text-sm text-muted">
                      {fmt(e.year)}
                      {e.endYear && e.endYear !== e.year ? `–${e.endYear < 0 ? `${-e.endYear} BC` : e.endYear}` : ""}{" "}
                      <span className="ml-2 rounded-full bg-surface-2 px-2 text-xs capitalize">{e.category}</span>
                    </p>
                    <p className="font-semibold">{e.title}</p>
                    {e.summary && <p className="max-w-prose text-sm">{e.summary}</p>}
                  </li>
                ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
