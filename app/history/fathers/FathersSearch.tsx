"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formatRef } from "@/lib/books";
import { data } from "@/lib/data/browser";
import { useLoad } from "@/lib/data/use";
import { verseHref } from "@/lib/href";

export function FathersSearch() {
  const q = useSearchParams().get("q") ?? "";
  const router = useRouter();
  const total = useLoad(() => data.fatherDocs().then((d) => d.length), []);
  const rows = useLoad(() => (q.trim() ? data.searchFathers(q, 40) : Promise.resolve([])), [q]);
  return (
    <>
      <p className="-mt-4 mb-6 max-w-prose text-lg text-muted">
        {total.status === "ready" ? total.value.toLocaleString("en") : "About 30,000"} comments on Scripture from the early
        church and medieval writers, in public-domain translations (Ante-Nicene and Nicene Fathers, Newman's Catena Aurea).
      </p>
      <form
        className="mb-8 flex max-w-xl gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const value = String(new FormData(e.currentTarget).get("q") ?? "").trim();
          router.push(`/history/fathers/?q=${encodeURIComponent(value)}`);
        }}
      >
        <input key={q} name="q" defaultValue={q} placeholder="recapitulation, ransom, adoption…" aria-label="Search the Fathers" className="w-full rounded-full border border-border bg-surface px-4 py-2" />
        <button className="rounded-full bg-accent px-4 py-2 font-semibold text-bg">Search</button>
      </form>
      {rows.status === "loading" && <p className="animate-pulse text-muted motion-reduce:animate-none">Searching…</p>}
      {rows.status === "error" && <p role="alert">{rows.message}</p>}
      <ul className="space-y-6">
        {(rows.status === "ready" ? rows.value : []).map((r) => (
          <li key={r.id}>
            <p className="text-sm">
              <span className="font-semibold">{r.father}</span>
              {r.year && <span className="text-muted"> (c. AD {r.year})</span>} on{" "}
              <Link href={verseHref(r.osis)} className="underline">{formatRef(r.osis)}</Link>
            </p>
            <p className="mt-1 max-w-prose leading-relaxed [&_mark]:bg-accent/20 [&_mark]:text-ink" dangerouslySetInnerHTML={{ __html: r.snippet }} />
            {r.sourceTitle && <p className="text-xs text-muted">{r.sourceTitle}</p>}
          </li>
        ))}
      </ul>
      {q && rows.status === "ready" && !rows.value.length && <p className="text-muted">No comments matched. Try a simpler word.</p>}
    </>
  );
}
