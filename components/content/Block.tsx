import Link from "next/link";
import { TypeChip, type ContentType } from "@/components/ui/TypeChip";
import type { BlockView } from "@/lib/db/content";

const CONSENSUS: Record<string, string> = {
  consensus: "Scholarly consensus",
  majority: "Majority view",
  minority: "Minority view",
};

export function Citations({ block }: { block: BlockView }) {
  if (block.needsSource) {
    return (
      <p className="mt-3 inline-flex items-center gap-2 rounded border border-dashed border-muted px-2 py-1 text-xs text-muted">
        Source needed: no citation yet for this view
      </p>
    );
  }
  if (!block.citations.length) return null;
  return (
    <ul className="mt-3 space-y-1 text-xs text-muted">
      {block.citations.map((c) => (
        <li key={c.id} className="flex flex-wrap items-baseline gap-x-2">
          <span>
            {c.workTitle ? <cite className="not-italic font-semibold text-ink">{c.workTitle}</cite> : null}
            {c.workTitle && c.ref ? ", " : null}
            {c.url ? (
              <a href={c.url} className="underline" rel="noreferrer">
                {c.ref}
              </a>
            ) : (
              c.ref
            )}
          </span>
          {c.verified ? (
            <span className="text-accent">Checked</span>
          ) : (
            <span className="rounded border border-dotted border-muted px-1">
              {c.copyright === "copyrighted" ? "Page reference needed" : "Citation to check"}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

/** One typed, sourced piece of content: type, provenance and citations are always visible. */
export function Block({ block, showTitle = true }: { block: BlockView; showTitle?: boolean }) {
  return (
    <article data-block={block.id} data-type={block.type} className="py-4 first:pt-0">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <TypeChip type={block.type as ContentType} by={block.by?.name} />
        {CONSENSUS[block.consensus] && (
          <span className="text-xs text-muted">{CONSENSUS[block.consensus]}</span>
        )}
        {block.status === "draft" && (
          <span className="text-xs text-muted" title="Drafted for the owner to review">
            {block.author === "claude" ? "AI-drafted, not yet reviewed" : "Draft"}
          </span>
        )}
      </div>
      {showTitle && block.title && <h3 className="mb-1 text-lg font-semibold">{block.title}</h3>}
      {block.by && block.type === "scholarly_interpretation" && (
        <p className="mb-1 text-sm text-muted">
          The view of{" "}
          <Link href={`/history/people/${block.by.id}`} className="underline decoration-dotted">
            {block.by.name}
          </Link>
        </p>
      )}
      <div
        className="prose-block max-w-prose leading-relaxed"
        dangerouslySetInnerHTML={{ __html: block.bodyHtml }}
      />
      <Citations block={block} />
    </article>
  );
}

export const SECTION_TITLES: Record<string, string> = {
  overview: "Overview",
  meaning: "Range of meaning",
  culture: "Culture and background",
  background: "Background",
  translation_history: "Translation history",
  lens: "Relational reading",
  legal_history: "How the legal reading arose",
  voices: "Voices",
  fathers: "Church Fathers",
  structure: "Literary structure",
  fulfillment: "Fulfilment in Christ",
  misunderstanding: "Common misunderstandings",
  hearers: "How first hearers understood it",
  dating: "Date",
  authorship: "Authorship",
  outline: "Outline",
  themes: "Themes",
  christ: "Reading it through Christ",
  history: "History",
  practice: "Practice",
  caution: "A caution",
  notes: "Notes",
};

const SECTION_ORDER = Object.keys(SECTION_TITLES);

export function groupBySection(blocks: BlockView[]): [string, BlockView[]][] {
  const groups = new Map<string, BlockView[]>();
  for (const b of blocks) groups.set(b.section, [...(groups.get(b.section) ?? []), b]);
  return [...groups].sort((a, b) => SECTION_ORDER.indexOf(a[0]) - SECTION_ORDER.indexOf(b[0]));
}

export function BlockList({ blocks }: { blocks: BlockView[] }) {
  return (
    <div className="divide-y divide-border">
      {blocks.map((b) => (
        <Block key={b.id} block={b} />
      ))}
    </div>
  );
}
