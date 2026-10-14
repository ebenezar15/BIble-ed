import { EntryPage } from "@/components/content/EntryPage";
import { entryParams } from "@/lib/data/server";

export const dynamicParams = false;
export const generateStaticParams = entryParams("roman_term");

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <EntryPage kind="roman_term" slug={slug} back={{ href: "/rome", label: "The Roman world" }} />;
}
