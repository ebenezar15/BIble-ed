import { EntryPage } from "@/components/content/EntryPage";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <EntryPage kind="jesus_word" slug={slug} back={{ href: "/jesus", label: "Words of Jesus" }} />;
}
