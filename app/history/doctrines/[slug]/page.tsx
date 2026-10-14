import { EntryPage } from "@/components/content/EntryPage";
import { entryParams } from "@/lib/data/server";

export const dynamicParams = false;
export const generateStaticParams = entryParams("doctrine");

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <EntryPage kind="doctrine" slug={slug} back={{ href: "/history/doctrines", label: "How did we get this doctrine?" }} />;
}
