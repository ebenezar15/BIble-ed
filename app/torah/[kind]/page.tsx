import { notFound } from "next/navigation";
import { EntryGrid, PageIntro } from "@/components/content/EntryGrid";
import { KIND_LABEL, TORAH_KINDS } from "@/lib/content/routes";
import { data } from "@/lib/data/server";

export const dynamicParams = false;
export const generateStaticParams = () => TORAH_KINDS.map((kind) => ({ kind }));

export default async function Page({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!(TORAH_KINDS as readonly string[]).includes(kind)) notFound();
  return (
    <main className="mx-auto max-w-5xl px-4 pb-24">
      <PageIntro title={KIND_LABEL[kind]} />
      <EntryGrid entries={await data.listEntries(kind)} />
    </main>
  );
}
