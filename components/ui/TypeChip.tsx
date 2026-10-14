export type ContentType =
  | "lexical_fact"
  | "historical_fact"
  | "scholarly_interpretation"
  | "lens_commentary"
  | "contested"
  | "legal_reading_history"
  | "awaiting";

const LABELS: Record<ContentType, string> = {
  lexical_fact: "Lexical fact",
  historical_fact: "Historical fact",
  scholarly_interpretation: "Scholarly interpretation",
  lens_commentary: "Lens commentary",
  contested: "Contested",
  legal_reading_history: "How the legal reading arose",
  awaiting: "Awaiting sources",
};

const STYLES: Record<ContentType, string> = {
  lexical_fact: "border-accent text-accent",
  historical_fact: "border-accent-2 text-accent-2",
  scholarly_interpretation: "border-ink text-ink",
  lens_commentary: "border-hebrew text-hebrew",
  contested: "border-dashed border-muted text-muted",
  legal_reading_history: "border-muted text-muted",
  awaiting: "border-dotted border-muted text-muted",
};

export function TypeChip({ type, by }: { type: ContentType; by?: string }) {
  return (
    <span
      data-content-type={type}
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${STYLES[type]}`}
    >
      {LABELS[type]}
      {by && <span className="ml-1 font-normal">({by})</span>}
    </span>
  );
}
