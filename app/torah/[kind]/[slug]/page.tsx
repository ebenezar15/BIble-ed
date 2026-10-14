import { notFound } from "next/navigation";
import { EntryPage } from "@/components/content/EntryPage";
import { TORAH_KINDS } from "@/lib/content/routes";
import { data } from "@/lib/data/server";

export const dynamicParams = false;

export async function generateStaticParams() {
  const all = await Promise.all(TORAH_KINDS.map((kind) => data.listEntries(kind)));
  return all.flat().map((e) => ({ kind: e.kind, slug: e.slug }));
}

export default async function Page({ params }: { params: Promise<{ kind: string; slug: string }> }) {
  const { kind, slug } = await params;
  if (!(TORAH_KINDS as readonly string[]).includes(kind)) notFound();
  return <EntryPage kind={kind} slug={slug} back={{ href: "/torah", label: "Torah, worship and patterns" }} />;
}
