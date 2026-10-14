import type { Metadata } from "next";
import { PageIntro } from "@/components/content/EntryGrid";
import { Timeline, type TimelineEvent } from "@/components/content/Timeline";
import { listEntries } from "@/lib/db/content";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Timeline" };

export default async function Page() {
  const events: TimelineEvent[] = (await listEntries("timeline")).map((e) => {
    const d = e.data as { year: number; end_year?: number | null; category?: string };
    return { slug: e.slug, title: e.title, summary: e.summary, year: d.year, endYear: d.end_year, category: d.category ?? "other" };
  });
  return (
    <main className="mx-auto max-w-5xl px-4 pb-24">
      <PageIntro title="From the apostles to today">Councils, schisms, reformations and revivals. Filter by kind of event or jump to a century.</PageIntro>
      {events.length ? <Timeline events={events} /> : <p className="text-muted">No timeline events imported yet.</p>}
    </main>
  );
}
