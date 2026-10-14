"use client";

import { useEffect, useRef, useState } from "react";
import { PRESET_IDS, PRESETS } from "@/lib/theme/presets";
import { useTheme } from "./ThemeProvider";

const MODES = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "Match device" },
] as const;

export function ThemeStudio() {
  const { settings, update, scheme } = useTheme();
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-border px-3 py-1.5 text-sm hover:border-accent focus-visible:outline-2 focus-visible:outline-accent"
        aria-haspopup="dialog"
      >
        <span aria-hidden className="mr-1.5 inline-block size-3 rounded-full bg-accent align-[-1px]" />
        Theme
      </button>
      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === dialog.current && setOpen(false)}
        aria-labelledby="theme-studio-title"
        className="studio m-0 ml-auto h-dvh max-h-dvh w-full max-w-md bg-surface p-0 text-ink backdrop:bg-black/40"
      >
        <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
          <div className="flex items-baseline justify-between">
            <h2 id="theme-studio-title" className="text-xl font-semibold">Theme studio</h2>
            <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted underline">
              Done
            </button>
          </div>

          <fieldset>
            <legend className="mb-3 font-semibold">Colour scheme</legend>
            <div className="grid grid-cols-2 gap-3">
              {PRESET_IDS.map((id) => {
                const p = PRESETS[id][scheme];
                const active = settings.preset === id && !settings.accent;
                return (
                  <button
                    key={id}
                    type="button"
                    data-preset-option={id}
                    aria-pressed={active}
                    onClick={() => update({ preset: id, accent: null })}
                    className="group rounded-lg border-2 p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-accent"
                    style={{ background: p.bg, color: p.ink, borderColor: active ? p.accent : p.border }}
                  >
                    <span className="flex items-center justify-between">
                      <span lang="he" dir="rtl" className="font-hebrew text-2xl leading-none" style={{ color: p.hebrew }}>
                        א
                      </span>
                      <span className="flex gap-1" aria-hidden>
                        {[p.accent, p.accent2, p.greek].map((c) => (
                          <span key={c} className="size-3 rounded-full" style={{ background: c }} />
                        ))}
                      </span>
                    </span>
                    <span className="mt-2 block text-sm font-semibold">{PRESETS[id].name}</span>
                    <span className="block text-xs" style={{ color: p.muted }}>
                      {PRESETS[id].blurb}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-3 font-semibold">Light or dark</legend>
            <div className="inline-flex rounded-full border border-border p-1" role="radiogroup">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={settings.mode === m.id}
                  onClick={() => update({ mode: m.id })}
                  className={`rounded-full px-3 py-1 text-sm ${settings.mode === m.id ? "bg-accent text-bg" : "text-muted"}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-1 font-semibold">Your own colour</legend>
            <p className="mb-3 text-sm text-muted">
              Pick any colour and the whole palette is built around it, with text kept readable.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="color"
                aria-label="Custom accent colour"
                value={settings.accent ?? "#1e4596"}
                onChange={(e) => update({ accent: e.target.value })}
                className="h-10 w-16 cursor-pointer rounded border border-border bg-transparent"
              />
              {settings.accent && (
                <button type="button" onClick={() => update({ accent: null })} className="text-sm underline">
                  Back to {PRESETS[settings.preset].name}
                </button>
              )}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-3 font-semibold">Text size</legend>
            <input
              type="range"
              min={0.9}
              max={1.3}
              step={0.05}
              value={settings.scale}
              onChange={(e) => update({ scale: Number(e.target.value) })}
              aria-label="Text size"
              className="w-full accent-[var(--accent)]"
            />
          </fieldset>

          <div className="rounded-lg border border-border bg-bg p-4">
            <p className="text-sm text-muted">Preview</p>
            <p className="mt-2 flex items-baseline gap-3">
              <span lang="he" dir="rtl" className="font-hebrew text-3xl text-hebrew">חֶסֶד</span>
              <span>steadfast covenant love</span>
            </p>
            <p className="mt-1 flex items-baseline gap-3">
              <span lang="grc" className="font-greek text-3xl text-greek">ἀγάπη</span>
              <span>self-giving love</span>
            </p>
          </div>
        </div>
      </dialog>
    </>
  );
}
