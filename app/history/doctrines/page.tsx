import { EntryGrid, PageIntro } from "@/components/content/EntryGrid";
import { data } from "@/lib/data/server";

export default async function Page() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-24">
      <PageIntro title="How did we get this doctrine?" />
      <EntryGrid entries={await data.listEntries("doctrine")} />
    </main>
  );
}
