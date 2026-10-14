"use client";

import { verseHref } from "@/lib/href";
import Link from "next/link";
import { useState } from "react";
import { formatRef } from "@/lib/books";

type Level = { label: string; ref?: string; text: string };

const base = (label: string) => label.replace(/[′'’]+$/, "");

/** A chiasm drawn as a ladder: matching lines share an indent; hover one side to light its pair. */
export function ChiasmLadder({ levels, form = "chiasm" }: { levels: Level[]; form?: string }) {
  const [hover, setHover] = useState<string | null>(null);
  const order: string[] = [];
  for (const l of levels) if (!order.includes(base(l.label))) order.push(base(l.label));
  return (
    <ol className="space-y-1.5" aria-label={`${form} structure`}>
      {levels.map((l, i) => {
        const key = base(l.label);
        const depth = order.indexOf(key);
        const lit = hover === key;
        const centre = key === "X" || (depth === order.length - 1 && levels.filter((x) => base(x.label) === key).length === 1);
        return (
          <li
            key={`${l.label}-${i}`}
            style={{ marginLeft: `${depth * 1.25}rem`, animationDelay: `${i * 60}ms` }}
            onMouseEnter={() => setHover(key)}
            onMouseLeave={() => setHover(null)}
            className={`ladder-rung flex items-baseline gap-3 rounded-lg border px-3 py-2 transition-colors ${
              lit ? "border-accent bg-surface-2" : centre ? "border-accent-2" : "border-border"
            }`}
          >
            <span className={`w-7 shrink-0 font-semibold ${centre ? "text-accent-2" : "text-accent"}`}>{l.label}</span>
            <span className="min-w-0">
              <span className="block">{l.text}</span>
              {l.ref && (
                <Link href={verseHref(l.ref.split("-")[0])} className="text-xs text-muted underline decoration-dotted">
                  {formatRef(l.ref.split("-")[0])}
                  {l.ref.includes("-") && `–${l.ref.split("-")[1].split(".").slice(2).join("")}`}
                </Link>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
