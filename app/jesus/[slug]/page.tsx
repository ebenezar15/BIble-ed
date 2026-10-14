import { EntryPage } from "@/components/content/EntryPage";
import { entryParams } from "@/lib/data/server";

export const dynamicParams = false;
export const generateStaticParams = entryParams("jesus_word");

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <EntryPage kind="jesus_word" slug={slug} back={{ href: "/jesus", label: "Words of Jesus" }} />;
}
