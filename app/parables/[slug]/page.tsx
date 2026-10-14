import { EntryPage } from "@/components/content/EntryPage";
import { entryParams } from "@/lib/data/server";

export const dynamicParams = false;
export const generateStaticParams = entryParams("parable");

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <EntryPage kind="parable" slug={slug} back={{ href: "/parables", label: "Parables" }} />;
}
