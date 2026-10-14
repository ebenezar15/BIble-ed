import type { Metadata } from "next";
import Link from "next/link";
import { CalendarWheel, type FestivalPoint } from "@/components/content/CalendarWheel";
import { EntryGrid, PageIntro } from "@/components/content/EntryGrid";
import { TabernaclePlan, type TabernacleItem } from "@/components/content/TabernaclePlan";
import { KIND_LABEL } from "@/lib/content/routes";
import { listEntries } from "@/lib/db/content";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Torah, worship and patterns" };

const SECTIONS: [string, string][] = [
  ["sacrifice", "Sacrifices and offerings"],
  ["law", "The law"],
  ["covenant", "Covenants"],
  ["christophany", "Christophanies and theophanies"],
  ["typology", "Types and promise-shaped patterns"],
  ["structure", "Literary structures"],
  ["number", "Numbers"],
];

export default async function Page() {
  const [festivals, tabernacle, ...rest] = await Promise.all([
    listEntries("festival"),
    listEntries("tabernacle"),
    ...SECTIONS.map(([k]) => listEntries(k)),
  ]);
  const points: FestivalPoint[] = festivals
    .filter((f) => (f.data as { month?: number }).month)
    .map((f) => {
      const d = f.data as { month: number; day_start?: number; day_end?: number; end_month?: number };
      return { slug: f.slug, title: f.title, month: d.month, day: d.day_start ?? 1, dayEnd: d.day_end, endMonth: d.end_month, summary: f.summary };
    });
  const items: TabernacleItem[] = tabernacle.map((t) => {
    const d = t.data as { zone: string; x: number; y: number };
    return { slug: t.slug, title: t.title, zone: d.zone, x: d.x ?? 50, y: d.y ?? 50, summary: t.summary };
  });
  return (
    <main className="mx-auto max-w-5xl px-4 pb-24">
      <PageIntro title="Torah, worship and patterns">
        The feasts, offerings, laws, covenants and patterns of Israel's worship, and how Jesus fulfils them.
      </PageIntro>
      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold">The festival year</h2>
        {points.length ? <CalendarWheel festivals={points} /> : <p className="text-muted">No festivals imported yet.</p>}
      </section>
      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold">The tabernacle</h2>
        {items.length ? <TabernaclePlan items={items} /> : <p className="text-muted">No tabernacle items imported yet.</p>}
      </section>
      {SECTIONS.map(([kind, title], i) => (
        <section key={kind} className="mb-12">
          <h2 className="mb-4 flex items-baseline justify-between text-xl font-semibold">
            {title}
            <Link href={`/torah/${kind}`} className="text-sm font-normal text-muted underline">
              All {KIND_LABEL[kind].toLowerCase()} entries
            </Link>
          </h2>
          <EntryGrid entries={rest[i].slice(0, 6)} />
        </section>
      ))}
    </main>
  );
}
