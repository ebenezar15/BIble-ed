import Link from "next/link";
import { entryHref } from "@/lib/content/routes";
import type { EntrySummary } from "@/lib/db/content";

export function EntryGrid({ entries, empty }: { entries: EntrySummary[]; empty?: string }) {
  if (!entries.length) {
    return <p className="text-muted">{empty ?? "Nothing here yet. Run npm run etl after adding content."}</p>;
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map((e) => (
        <li key={`${e.kind}/${e.slug}`}>
          <Link
            href={entryHref(e.kind, e.slug)}
            className="flex h-full flex-col rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent"
          >
            <span className="font-semibold">{e.title}</span>
            {e.subtitle && <span className="text-sm text-muted">{e.subtitle}</span>}
            {e.summary && <span className="mt-2 line-clamp-3 text-sm">{e.summary}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function PageIntro({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <header className="pt-10 pb-8">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
      {children && <div className="mt-4 max-w-prose text-lg text-muted">{children}</div>}
    </header>
  );
}
