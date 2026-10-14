/**
 * STEP glosses mark morphemes with "/" (e.g. "according to/ covenant loyalty/ your") and
 * supplied words with [..]. Keep the longest morpheme, which carries the lemma's meaning.
 */
export function coreGloss(raw: string): string {
  const cleaned = raw
    .replace(/\[[^\]]*\]/g, "")
    .replace(/[<>]/g, "")
    .toLowerCase();
  const parts = cleaned.split("/").map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
  if (!parts.length) return raw.trim().toLowerCase();
  return parts.reduce((a, b) => (b.length > a.length ? b : a));
}

export function groupGlosses(rows: { gloss: string; count: number }[], limit = 12): { gloss: string; count: number }[] {
  const totals = new Map<string, number>();
  for (const r of rows) {
    const k = coreGloss(r.gloss);
    totals.set(k, (totals.get(k) ?? 0) + r.count);
  }
  return [...totals]
    .map(([gloss, count]) => ({ gloss, count }))
    .sort((a, b) => b.count - a.count || a.gloss.localeCompare(b.gloss))
    .slice(0, limit);
}
