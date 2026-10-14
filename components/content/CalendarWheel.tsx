"use client";

import Link from "next/link";
import { useState } from "react";
import { festivalDate } from "@/lib/format";

const MONTHS = ["Nisan", "Iyyar", "Sivan", "Tammuz", "Av", "Elul", "Tishri", "Cheshvan", "Kislev", "Tevet", "Shevat", "Adar"];
const SEASON = ["Spring", "Spring", "Summer", "Summer", "Summer", "Summer", "Autumn", "Autumn", "Winter", "Winter", "Winter", "Spring"];

export type FestivalPoint = { slug: string; title: string; month: number; day: number; dayEnd?: number; endMonth?: number; summary?: string | null };

/** The biblical year as a wheel, Nisan at the top; festivals sit at their date. */
export function CalendarWheel({ festivals }: { festivals: FestivalPoint[] }) {
  const [focus, setFocus] = useState<FestivalPoint | null>(null);
  const S = 360, C = S / 2, R = 150, r = 98;
  const angle = (month: number, day: number) => ((month - 1 + (day - 1) / 30) / 12) * Math.PI * 2 - Math.PI / 2;
  const pt = (a: number, rad: number) => [C + rad * Math.cos(a), C + rad * Math.sin(a)];
  return (
    <div className="grid items-center gap-6 md:grid-cols-[minmax(0,26rem)_1fr]">
      <svg viewBox={`0 0 ${S} ${S}`} role="img" aria-label="Festival calendar" className="w-full">
        {MONTHS.map((m, i) => {
          const a0 = (i / 12) * Math.PI * 2 - Math.PI / 2;
          const a1 = ((i + 1) / 12) * Math.PI * 2 - Math.PI / 2;
          const [x0, y0] = pt(a0, R), [x1, y1] = pt(a1, R), [x2, y2] = pt(a1, r), [x3, y3] = pt(a0, r);
          const [tx, ty] = pt((a0 + a1) / 2, (R + r) / 2);
          return (
            <g key={m}>
              <path
                d={`M${x0},${y0} A${R},${R} 0 0 1 ${x1},${y1} L${x2},${y2} A${r},${r} 0 0 0 ${x3},${y3} Z`}
                fill={i % 2 ? "var(--surface)" : "var(--surface-2)"}
                stroke="var(--border)"
              />
              <text x={tx} y={ty + 4} textAnchor="middle" fontSize={11} fill="var(--muted)">
                {m}
              </text>
            </g>
          );
        })}
        <text x={C} y={C - 6} textAnchor="middle" fontSize={13} fill="var(--ink)" fontWeight={600}>
          {focus ? focus.title : "The feasts of the LORD"}
        </text>
        <text x={C} y={C + 12} textAnchor="middle" fontSize={11} fill="var(--muted)">
          {focus ? festivalDate({ month: focus.month, day_start: focus.day, day_end: focus.dayEnd, end_month: focus.endMonth }) : "Leviticus 23"}
        </text>
        {festivals.map((f) => {
          const [x, y] = pt(angle(f.month, f.day), R + 12);
          const [lx, ly] = pt(angle(f.month, f.day), r - 10);
          const on = focus?.slug === f.slug;
          return (
            <Link key={f.slug} href={`/torah/festival/${f.slug}`} aria-label={f.title}>
              <g onMouseEnter={() => setFocus(f)} onFocus={() => setFocus(f)} onMouseLeave={() => setFocus(null)}>
                <line x1={x} y1={y} x2={lx} y2={ly} stroke={on ? "var(--accent)" : "var(--border)"} />
                <circle cx={x} cy={y} r={on ? 9 : 7} fill={on ? "var(--accent)" : "var(--accent-2)"} />
              </g>
            </Link>
          );
        })}
      </svg>
      <ul className="space-y-2 text-sm">
        {[...festivals].sort((a, b) => a.month - b.month || a.day - b.day).map((f) => (
          <li key={f.slug}>
            <Link
              href={`/torah/festival/${f.slug}`}
              onMouseEnter={() => setFocus(f)}
              onMouseLeave={() => setFocus(null)}
              className="flex gap-3 hover:text-accent"
            >
              <span className="w-24 shrink-0 text-muted">
                {MONTHS[f.month - 1]} {f.day}
              </span>
              <span className="font-semibold">{f.title}</span>
              <span className="ml-auto text-xs text-muted">{SEASON[f.month - 1]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
