"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { data } from "@/lib/data/browser";
import { useLoad } from "@/lib/data/use";
import { nameHref } from "@/lib/href";

export function NamesView() {
  const q = useSearchParams().get("q") ?? "";
  const router = useRouter();
  const rows = useLoad(() => data.searchNames(q, q.trim() ? 40 : 60), [q]);
  return (
    <>
      <form
        className="mb-8 flex max-w-xl gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const value = String(new FormData(e.currentTarget).get("q") ?? "").trim();
          router.push(value ? `/names/?q=${encodeURIComponent(value)}` : "/names/");
        }}
      >
        <input key={q} name="q" defaultValue={q} placeholder="Abraham, Bethlehem, Melchizedek…" aria-label="Find a name" className="w-full rounded-full border border-border bg-surface px-4 py-2" />
        <button className="rounded-full bg-accent px-4 py-2 font-semibold text-bg">Find</button>
      </form>
      {rows.status === "loading" && <p className="text-muted">Loading…</p>}
      {rows.status === "error" && <p className="text-muted">{rows.message}</p>}
      {rows.status === "ready" && !rows.value.length && <p className="text-muted">No name matched “{q}”.</p>}
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {(rows.status === "ready" ? rows.value : []).map((n) => (
          <li key={n.id}>
            <Link href={nameHref(n.id)} className="block h-full rounded-lg border border-border bg-surface p-3 hover:border-accent">
              <span className="font-semibold">{n.name}</span>
              <span className="ml-2 text-xs text-muted">{n.kind}, {n.refCount} refs</span>
              {n.brief && <span className="block text-sm">{n.brief}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
