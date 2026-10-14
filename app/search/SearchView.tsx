"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { data } from "@/lib/data/browser";
import { useLoad, useTitle } from "@/lib/data/use";
import { runSearch, type SearchItem } from "@/lib/search/run";

function WordResult({ item }: { item: SearchItem }) {
  return (
    <li>
      <Link
        href={item.href}
        className="group flex h-full flex-col rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent"
      >
        <span className="flex items-baseline justify-between gap-3">
          <span
            lang={item.lang}
            dir={item.lang === "he" ? "rtl" : undefined}
            className={`text-3xl leading-tight ${item.lang === "he" ? "text-hebrew" : "text-greek"}`}
          >
            {item.title}
          </span>
          <span className="text-xs text-muted">{item.tag}</span>
        </span>
        <span className="mt-1 text-sm italic text-muted">{item.translit}</span>
        <span className="mt-2 font-semibold group-hover:text-accent">{item.subtitle}</span>
        {item.count !== undefined && (
          <span className="mt-auto pt-2 text-xs text-muted">
            {item.count.toLocaleString("en")} {item.count === 1 ? "occurrence" : "occurrences"}
          </span>
        )}
      </Link>
    </li>
  );
}

export function SearchView() {
  const q = useSearchParams().get("q") ?? "";
  const router = useRouter();
  const state = useLoad(() => runSearch(data, q), [q]);
  useTitle(q ? `“${q}”` : "Search");
  const redirect = state.status === "ready" ? state.value.redirect : undefined;
  useEffect(() => {
    if (redirect) router.replace(redirect);
  }, [redirect, router]);
  if (state.status === "loading" || redirect) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-semibold">{q ? <>Results for “{q}”</> : "Search"}</h1>
        {q && <p className="mt-4 animate-pulse text-muted motion-reduce:animate-none">Searching the library…</p>}
      </main>
    );
  }
  if (state.status === "error") {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-semibold">Search</h1>
        <p role="alert" className="mt-4">Search could not load the library: {state.message}</p>
      </main>
    );
  }
  const result = state.value;
  const empty = !result.groups.length;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-semibold">
        {q ? <>Results for “{q}”</> : "Search"}
      </h1>
      {result.notice && (
        <p role="status" className="mt-4 rounded-lg border border-border bg-surface-2 px-4 py-3">
          {result.notice}
        </p>
      )}
      {empty && !result.notice && (
        <p className="mt-4 max-w-prose text-muted">
          {q
            ? "Nothing matched. Try a transliteration (chesed, agape), a Strong's number (H2617, G26), Hebrew or Greek letters, or a reference such as Romans 5:10."
            : "Type a word, a Strong's number, Hebrew or Greek, or a verse reference."}
        </p>
      )}
      {result.groups.map((g) => (
        <section key={g.module} className="mt-8" aria-labelledby={`group-${g.module}`}>
          <h2 id={`group-${g.module}`} className="text-lg font-semibold">
            {g.module === "Words" ? "Hebrew and Greek words" : g.module === "Topics" ? "In the library" : g.module}
            <span className="ml-2 text-sm font-normal text-muted">{g.items.length}</span>
          </h2>
          {g.module === "Words" ? (
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((it) => (
                <WordResult key={it.href} item={it} />
              ))}
            </ul>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {g.items.map((it) => (
                <li key={it.href} className="py-3">
                  <Link href={it.href} className="font-semibold hover:text-accent">
                    {it.title}
                  </Link>
                  {it.tag && <span className="ml-2 text-xs text-muted">{it.tag}</span>}
                  <p
                    className="mt-1 max-w-prose text-sm [&_mark]:rounded [&_mark]:bg-accent/20 [&_mark]:px-0.5 [&_mark]:text-ink"
                    dangerouslySetInnerHTML={{ __html: it.subtitle }}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </main>
  );
}
