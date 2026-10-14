import { EntryPage } from "@/components/content/EntryPage";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <EntryPage kind="roman_term" slug={slug} back={{ href: "/rome", label: "The Roman world" }} />;
}
