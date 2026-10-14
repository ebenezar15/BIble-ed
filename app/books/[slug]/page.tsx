import Link from "next/link";
import { notFound } from "next/navigation";
import { EntryPage } from "@/components/content/EntryPage";
import { BOOKS } from "@/lib/books";
import { getBookChapters } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const book = BOOKS.find((b) => b.id.toLowerCase() === slug.toLowerCase());
  if (!book) notFound();
  const chapters = await getBookChapters(book.id);
  return (
    <EntryPage kind="book" slug={book.id.toLowerCase()} back={{ href: "/books", label: "Books of the Bible" }}>
      <section className="mb-8">
        <h2 className="mb-2 text-sm text-muted">Read a chapter</h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-1">
          {Array.from({ length: chapters }, (_, i) => i + 1).map((c) => (
            <Link key={c} href={`/verse/${book.id}.${c}.1`} className="flex h-10 items-center justify-center rounded border border-border text-sm tabular-nums hover:border-accent">
              {c}
            </Link>
          ))}
        </div>
      </section>
    </EntryPage>
  );
}
