"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { TokenView } from "@/lib/db/queries";
import { cleanGloss, cleanSurface, cleanTranslit } from "@/lib/display";

const ROWS = [
  { id: "translit", label: "Transliteration" },
  { id: "morph", label: "Grammar" },
  { id: "gloss", label: "English gloss" },
] as const;
type RowId = (typeof ROWS)[number]["id"];
const STORAGE = "logos.interlinear";

function loadRows(): Record<RowId, boolean> {
  const all = { translit: true, morph: false, gloss: true };
  try {
    return { ...all, ...JSON.parse(localStorage.getItem(STORAGE) ?? "{}") };
  } catch {
    return all;
  }
}

export function Interlinear({ tokens, language }: { tokens: TokenView[]; language: "heb" | "grc" }) {
  const [rows, setRows] = useState<Record<RowId, boolean>>({ translit: true, morph: false, gloss: true });
  const [active, setActive] = useState<number | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHebrew = language === "heb";
  const lang = isHebrew ? "he" : "grc";

  useEffect(() => setRows(loadRows()), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setActive(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function toggle(id: RowId, on: boolean) {
    const next = { ...rows, [id]: on };
    setRows(next);
    try {
      localStorage.setItem(STORAGE, JSON.stringify(next));
    } catch {}
  }
  const open = (i: number) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setActive(i);
  };
  const closeSoon = () => {
    closeTimer.current = setTimeout(() => setActive(null), 180);
  };

  return (
    <div>
      <fieldset className="mb-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <legend className="sr-only">Interlinear rows</legend>
        {ROWS.map((r) => (
          <label key={r.id} className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={rows[r.id]}
              onChange={(e) => toggle(r.id, e.target.checked)}
              className="size-4 accent-[var(--accent)]"
            />
            {r.label}
          </label>
        ))}
      </fieldset>

      <div data-interlinear dir={isHebrew ? "rtl" : "ltr"} className="flex flex-wrap gap-x-4 gap-y-5">
        {tokens.map((t, i) => {
          const title = t.srcRef.includes(".0(");
          return (
            <div
              key={t.pos}
              data-token
              className="relative"
              onMouseEnter={() => open(i)}
              onMouseLeave={closeSoon}
            >
              <button
                type="button"
                onFocus={() => open(i)}
                onBlur={closeSoon}
                onClick={() => (active === i ? setActive(null) : open(i))}
                aria-describedby={active === i ? `pop-${i}` : undefined}
                className={`rounded px-1 text-left transition-colors ${active === i ? "bg-surface-2" : ""} ${title ? "opacity-80" : ""}`}
              >
                <span
                  lang={lang}
                  className={`block text-3xl leading-tight ${isHebrew ? "text-hebrew" : "text-greek"}`}
                >
                  {cleanSurface(t.surface)}
                </span>
              </button>
              <div dir="ltr" className={`px-1 text-xs ${isHebrew ? "text-right" : ""}`}>
                {rows.translit && (
                  <span data-row="translit" className="block italic text-muted">
                    {cleanTranslit(t.translit)}
                  </span>
                )}
                {rows.morph && (
                  <span data-row="morph" className="block text-muted" title={t.morphLabel}>
                    {t.morph}
                  </span>
                )}
                {rows.gloss && (
                  <span data-row="gloss" className="block max-w-[9rem] text-sm text-ink">
                    {cleanGloss(t.gloss)}
                  </span>
                )}
              </div>
              {active === i && (
                <div
                  id={`pop-${i}`}
                  role="tooltip"
                  dir="ltr"
                  onMouseEnter={() => open(i)}
                  onMouseLeave={closeSoon}
                  className={`absolute top-full z-20 mt-2 w-64 rounded-lg border border-border bg-surface p-3 text-left text-sm shadow-lg ${
                    isHebrew ? "right-0" : "left-0"
                  }`}
                >
                  {t.lemma && (
                    <p className="flex items-baseline gap-2">
                      <span lang={lang} dir={isHebrew ? "rtl" : undefined} className={`text-xl ${isHebrew ? "text-hebrew" : "text-greek"}`}>
                        {t.lemma}
                      </span>
                      <span className="font-semibold">{t.lemmaGloss}</span>
                    </p>
                  )}
                  {t.morphLabel && <p className="mt-1 text-muted">{t.morphLabel}</p>}
                  {title && <p className="mt-1 text-muted">Part of the psalm's title (verse 1 in Hebrew).</p>}
                  {t.lemmaId && (
                    <Link href={`/word/${t.lemmaId}`} className="mt-2 inline-block font-semibold text-accent underline">
                      Open word study ({t.lemmaId})
                    </Link>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
