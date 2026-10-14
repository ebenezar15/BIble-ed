import { EntryPage } from "@/components/content/EntryPage";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <EntryPage kind="doctrine" slug={slug} back={{ href: "/history/doctrines", label: "How did we get this doctrine?" }} />;
}
