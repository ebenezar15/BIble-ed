import type { Metadata } from "next";
import { EntryGrid, PageIntro } from "@/components/content/EntryGrid";
import { listEntries } from "@/lib/db/content";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Parables" };

export default async function Page() {
  const entries = await listEntries("parable");
  return (
    <main className="mx-auto max-w-5xl px-4 pb-24">
      <PageIntro title="Parables">Each parable in its village setting: honour and shame, farming, money and law, and the Father it reveals.</PageIntro>
      <EntryGrid entries={entries} />
    </main>
  );
}
