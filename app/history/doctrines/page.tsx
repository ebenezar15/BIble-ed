import { EntryGrid, PageIntro } from "@/components/content/EntryGrid";
import { listEntries } from "@/lib/db/content";

export const dynamic = "force-dynamic";

export default async function Page() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-24">
      <PageIntro title="How did we get this doctrine?" />
      <EntryGrid entries={await listEntries("doctrine")} />
    </main>
  );
}
