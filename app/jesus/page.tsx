import type { Metadata } from "next";
import { EntryGrid, PageIntro } from "@/components/content/EntryGrid";
import { data } from "@/lib/data/server";

export const metadata: Metadata = { title: "Words of Jesus" };

export default async function Page() {
  const entries = await data.listEntries("jesus_word");
  return (
    <main className="mx-auto max-w-5xl px-4 pb-24">
      <PageIntro title="Words of Jesus">The words and phrases Jesus used, what his first hearers heard in them, and what we often miss.</PageIntro>
      <EntryGrid entries={entries} />
    </main>
  );
}
