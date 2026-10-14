"use client";

import Link from "next/link";
import { useState } from "react";

export type TabernacleItem = { slug: string; title: string; zone: string; x: number; y: number; summary?: string | null };

/** Floor plan of the tabernacle, gate at the east (bottom). Tap an item to study it. */
export function TabernaclePlan({ items }: { items: TabernacleItem[] }) {
  const [focus, setFocus] = useState<TabernacleItem | null>(null);
  const W = 200, H = 300;
  const px = (x: number) => 20 + (x / 100) * (W - 40);
  const py = (y: number) => 20 + (y / 100) * (H - 40);
  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,18rem)_1fr]">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Tabernacle floor plan" className="w-full max-w-xs">
        <rect x={10} y={10} width={W - 20} height={H - 20} fill="var(--surface)" stroke="var(--border)" />
        <rect x={60} y={20} width={80} height={130} fill="var(--surface-2)" stroke="var(--accent-2)" />
        <rect x={60} y={20} width={80} height={45} fill="color-mix(in srgb, var(--accent-2) 18%, var(--surface-2))" stroke="var(--accent-2)" />
        <line x1={60} y1={65} x2={140} y2={65} stroke="var(--hebrew)" strokeWidth={2} strokeDasharray="4 2" />
        <text x={100} y={36} textAnchor="middle" fontSize={8} fill="var(--muted)">Most holy place</text>
        <text x={100} y={80} textAnchor="middle" fontSize={8} fill="var(--muted)">Holy place</text>
        <rect x={80} y={H - 14} width={40} height={6} fill="var(--accent)" />
        <text x={100} y={H - 18} textAnchor="middle" fontSize={8} fill="var(--muted)">Gate (east)</text>
        {items.map((it) => {
          const on = focus?.slug === it.slug;
          return (
            <Link key={it.slug} href={`/torah/tabernacle/${it.slug}`} aria-label={it.title}>
              <g onMouseEnter={() => setFocus(it)} onMouseLeave={() => setFocus(null)} onFocus={() => setFocus(it)}>
                <circle cx={px(it.x)} cy={py(it.y)} r={on ? 9 : 7} fill={on ? "var(--accent)" : "var(--hebrew)"} />
              </g>
            </Link>
          );
        })}
      </svg>
      <div>
        <p className="min-h-12 text-sm text-muted" aria-live="polite">
          {focus ? (
            <>
              <span className="font-semibold text-ink">{focus.title}</span> {focus.summary}
            </>
          ) : (
            "Hover or tap a point on the plan, or choose from the list."
          )}
        </p>
        <ul className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
          {items.map((it) => (
            <li key={it.slug}>
              <Link href={`/torah/tabernacle/${it.slug}`} onMouseEnter={() => setFocus(it)} className="hover:text-accent">
                {it.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
