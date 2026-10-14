import { EntryPage } from "@/components/content/EntryPage";
import { entryParams } from "@/lib/data/server";

export const dynamicParams = false;
export const generateStaticParams = entryParams("denomination");

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <EntryPage kind="denomination" slug={slug} back={{ href: "/history/denominations", label: "Denominations" }} />;
}
