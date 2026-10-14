import type { Metadata } from "next";
import { EntryGrid, PageIntro } from "@/components/content/EntryGrid";
import { data } from "@/lib/data/server";

export const metadata: Metadata = { title: "Parables" };

export default async function Page() {
  const entries = await data.listEntries("parable");
  return (
    <main className="mx-auto max-w-5xl px-4 pb-24">
      <PageIntro title="Parables">Each parable in its village setting: honour and shame, farming, money and law, and the Father it reveals.</PageIntro>
      <EntryGrid entries={entries} />
    </main>
  );
}
