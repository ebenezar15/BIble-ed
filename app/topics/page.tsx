import type { Metadata } from "next";
import { EntryGrid, PageIntro } from "@/components/content/EntryGrid";
import { listEntries } from "@/lib/db/content";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Studies" };

export default async function Page() {
  const entries = await listEntries("essay");
  return (
    <main className="mx-auto max-w-5xl px-4 pb-24">
      <PageIntro title="Studies">Longer studies: how the Bible was written, dated, copied and gathered.</PageIntro>
      <EntryGrid entries={entries} />
    </main>
  );
}
