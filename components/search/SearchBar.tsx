"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { SearchItem } from "@/lib/search/run";

const HEBREW = /[֐-׿]/;

export function SearchBar({ autoFocus = false, large = false }: { autoFocus?: boolean; large?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest("input, textarea, [contenteditable]");
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) {
      setItems([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = await res.json();
        setItems(data.items ?? []);
        setActive(-1);
      } catch {}
    }, 160);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (active >= 0 && items[active]) return go(items[active].href);
    if (q.trim()) go(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!items.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showList = open && items.length > 0;
  return (
    <form role="search" onSubmit={submit} className="relative">
      <input
        ref={input}
        value={q}
        autoFocus={autoFocus}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
        dir={HEBREW.test(q) ? "rtl" : "auto"}
        type="search"
        name="q"
        autoComplete="off"
        spellCheck={false}
        aria-label="Search words, Strong's numbers or verses"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        role="combobox"
        placeholder={large ? "hesed, ἀγάπη, H2617, Romans 5:10…" : "Search"}
        className={`w-full rounded-full border border-border bg-surface text-ink placeholder:text-muted focus:border-accent focus:outline-none ${
          large ? "px-6 py-4 text-lg shadow-sm" : "px-4 py-1.5 text-sm"
        }`}
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-40 mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-surface py-1 shadow-lg"
        >
          {items.map((it, i) => (
            <li
              key={it.href + i}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                go(it.href);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-baseline gap-3 px-4 py-2 ${i === active ? "bg-surface-2" : ""}`}
            >
              <span
                lang={it.lang}
                dir={it.lang === "he" ? "rtl" : undefined}
                className={`shrink-0 text-lg ${it.lang === "he" ? "text-hebrew" : it.lang === "grc" ? "text-greek" : "font-semibold"}`}
              >
                {it.title}
              </span>
              {it.translit && <span className="shrink-0 text-sm italic text-muted">{it.translit}</span>}
              <span
                className="min-w-0 truncate text-sm"
                dangerouslySetInnerHTML={it.lang ? undefined : { __html: it.subtitle }}
              >
                {it.lang ? it.subtitle : undefined}
              </span>
              {it.tag && <span className="ml-auto shrink-0 text-xs text-muted">{it.tag}</span>}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
