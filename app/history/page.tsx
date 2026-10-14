import type { Metadata } from "next";
import Link from "next/link";
import { EntryGrid, PageIntro } from "@/components/content/EntryGrid";
import { data } from "@/lib/data/server";
import { lifeDates } from "@/lib/format";

export const metadata: Metadata = { title: "Church history and theology" };

export default async function Page() {
  const [people, denominations, doctrines] = await Promise.all([
    data.listPeople(),
    data.listEntries("denomination"),
    data.listEntries("doctrine"),
  ]);
  const fathers = people.filter((p) => p.roles.includes("father"));
  return (
    <main className="mx-auto max-w-5xl px-4 pb-24">
      <PageIntro title="Church history and theology">
        The Fathers, the councils, the splits and revivals, and how the doctrines we inherited came to be.
      </PageIntro>
      <p className="mb-10 flex flex-wrap gap-3">
        <Link href="/history/timeline" className="rounded-full bg-accent px-4 py-2 font-semibold text-bg">Timeline</Link>
        <Link href="/history/fathers" className="rounded-full border border-border px-4 py-2 hover:border-accent">Search the Fathers</Link>
        <Link href="/history/people" className="rounded-full border border-border px-4 py-2 hover:border-accent">People and their works</Link>
      </p>
      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold">How did we get this doctrine?</h2>
        <EntryGrid entries={doctrines} />
      </section>
      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold">The early Church Fathers</h2>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {fathers.map((p) => (
            <li key={p.id}>
              <Link href={`/history/people/${p.id}`} className="block rounded-lg border border-border bg-surface p-3 hover:border-accent">
                <span className="font-semibold">{p.name}</span>
                <span className="block text-xs text-muted">
                  {[lifeDates(p.born, p.died), p.era].filter(Boolean).join(", ")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="mb-4 text-xl font-semibold">Denominations</h2>
        <EntryGrid entries={denominations} />
      </section>
    </main>
  );
}
