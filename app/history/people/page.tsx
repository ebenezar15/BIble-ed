import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/content/EntryGrid";
import { listPeople } from "@/lib/db/content";
import { lifeDates } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "People and their works" };

export default async function Page() {
  const people = await listPeople();
  return (
    <main className="mx-auto max-w-5xl px-4 pb-24">
      <PageIntro title="People and their works">Fathers, reformers, scholars and teachers cited in this library, with their works. Copyrighted books are listed by title only.</PageIntro>
      <ul className="divide-y divide-border">
        {people.map((p) => (
          <li key={p.id} className="py-3">
            <Link href={`/history/people/${p.id}`} className="font-semibold hover:text-accent">{p.name}</Link>
            <span className="ml-2 text-sm text-muted">
              {[lifeDates(p.born, p.died), p.tradition].filter(Boolean).join(", ")}
            </span>
            {p.summary && <p className="max-w-prose text-sm">{p.summary}</p>}
          </li>
        ))}
      </ul>
    </main>
  );
}
