import type { Metadata } from "next";
import { EntryGrid, PageIntro } from "@/components/content/EntryGrid";
import { data } from "@/lib/data/server";

export const metadata: Metadata = { title: "The Roman world" };

export default async function Page() {
  const entries = await data.listEntries("roman_term");
  return (
    <main className="mx-auto max-w-5xl px-4 pb-24">
      <PageIntro title="The Roman world">The political, legal, religious and social words of the empire the New Testament was written into.</PageIntro>
      <EntryGrid entries={entries} />
    </main>
  );
}
