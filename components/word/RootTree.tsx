"use client";

import { wordHref } from "@/lib/href";
import Link from "next/link";
import { scaleSqrt } from "d3";
import { useState } from "react";
import type { LemmaRef } from "@/lib/data/types";

const SIZE = 360;
const stripped = (s: string) => s.replace(/[\u0591-\u05C7]/g, "");
const C = SIZE / 2;

/** A radial map of a Hebrew root: the root at the centre, every word built on it around it. */
export function RootTree({
  letters,
  gloss,
  current,
  family,
}: {
  letters: string;
  gloss: string | null;
  current: LemmaRef;
  family: LemmaRef[];
}) {
  const [hover, setHover] = useState<LemmaRef | null>(null);
  const nodes = [current, ...family].slice(0, 18);
  const radius = scaleSqrt()
    .domain([0, Math.max(...nodes.map((n) => n.count), 1)])
    .range([14, 34]);
  const ring = nodes.length > 10 ? [C - 50, C - 112] : [C - 62];
  const placed = nodes.map((n, i) => {
    const r = ring.length === 2 && i % 2 ? ring[1] : ring[0];
    const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
    return { n, x: C + r * Math.cos(angle), y: C + r * Math.sin(angle), size: radius(n.count) };
  });
  const focus = hover ?? current;

  return (
    <figure data-root-tree className="mx-auto max-w-md">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`Words built on the root ${letters}`} className="w-full">
        {placed.map(({ n, x, y }) => (
          <line key={`l-${n.id}`} x1={C} y1={C} x2={x} y2={y} stroke="var(--border)" strokeWidth={1.25} />
        ))}
        <circle cx={C} cy={C} r={38} fill="var(--surface-2)" stroke="var(--accent-2)" strokeWidth={1.5} />
        <text x={C} y={C + 9} textAnchor="middle" fontSize={26} fill="var(--hebrew)" style={{ fontFamily: "var(--font-hebrew)" }}>
          {letters}
        </text>
        {placed.map(({ n, x, y, size }, i) => {
          const isCurrent = n.id === current.id;
          return (
            <Link key={n.id} href={wordHref(n.id)} aria-label={`${n.lemma}, ${n.gloss}`}>
              <g
                className="root-node"
                style={{ ["--dx" as string]: `${C - x}px`, ["--dy" as string]: `${C - y}px`, animationDelay: `${i * 35}ms` }}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(n)}
                onBlur={() => setHover(null)}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={size}
                  fill={isCurrent ? "var(--accent)" : "var(--surface)"}
                  stroke={isCurrent ? "var(--accent)" : "var(--hebrew)"}
                  strokeWidth={1.5}
                />
                <text
                  x={x}
                  y={y + 6}
                  textAnchor="middle"
                  fontSize={Math.max(11, Math.min(size * 0.62, (size * 2.6) / Math.max(3, stripped(n.lemma).length)))}
                  fill={isCurrent ? "var(--bg)" : "var(--hebrew)"}
                  style={{ fontFamily: "var(--font-hebrew)" }}
                >
                  {n.lemma.replace(/[֑-֯]/g, "")}
                </text>
              </g>
            </Link>
          );
        })}
      </svg>
      <figcaption className="mt-2 text-center text-sm" aria-live="polite">
        <span lang="he" dir="rtl" className="text-lg text-hebrew">
          {focus.lemma}
        </span>{" "}
        <span className="italic text-muted">{focus.translit}</span> <span className="font-semibold">{focus.gloss}</span>{" "}
        <span className="text-muted">({focus.count.toLocaleString("en")}×)</span>
        {gloss && <span className="block text-muted">Root sense: {gloss}</span>}
      </figcaption>
    </figure>
  );
}
