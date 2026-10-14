import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/content/EntryGrid";
import { BOOKS } from "@/lib/books";
import { listEntries } from "@/lib/db/content";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Books of the Bible" };

export default async function Page() {
  const entries = new Map((await listEntries("book")).map((e) => [e.slug, e]));
  return (
    <main className="mx-auto max-w-5xl px-4 pb-24">
      <PageIntro title="Books of the Bible">
        Who wrote each book, when (with the full range of views), for whom, how it is built, and how it points to Christ.
      </PageIntro>
      <p className="mb-8 flex flex-wrap gap-3 text-sm">
        <Link href="/topics/nt-dating" className="rounded-full border border-border px-3 py-1 hover:border-accent">Dating the New Testament</Link>
        <Link href="/topics/canon" className="rounded-full border border-border px-3 py-1 hover:border-accent">How the canon formed</Link>
        <Link href="/topics/manuscripts" className="rounded-full border border-border px-3 py-1 hover:border-accent">From manuscripts to your Bible</Link>
      </p>
      {(["OT", "NT"] as const).map((t) => (
        <section key={t} className="mb-10">
          <h2 className="mb-3 text-xl font-semibold">{t === "OT" ? "Old Testament" : "New Testament"}</h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {BOOKS.filter((b) => b.testament === t).map((b) => {
              const e = entries.get(b.id.toLowerCase());
              const genre = (e?.data as { genre?: string } | undefined)?.genre;
              return (
                <li key={b.id}>
                  <Link href={`/books/${b.id.toLowerCase()}`} className="block h-full rounded-lg border border-border bg-surface p-3 hover:border-accent">
                    <span className="font-semibold">{b.name}</span>
                    {genre && <span className="block text-xs text-muted">{genre}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </main>
  );
}
