const MONTHS = ["Nisan", "Iyyar", "Sivan", "Tammuz", "Av", "Elul", "Tishri", "Cheshvan", "Kislev", "Tevet", "Shevat", "Adar"];
export const HEBREW_MONTHS = MONTHS;

const year = (y: number) => (y < 0 ? `${-y} BC` : `${y}`);

/** "130–202", "c. 4 BC – AD 65", "died 1536", "born 1948". */
export function lifeDates(born: number | null, died: number | null): string {
  if (born != null && died != null) {
    return born < 0 ? `c. ${year(born)} – AD ${died}` : `${born}–${died}`;
  }
  if (died != null) return `died ${year(died)}`;
  if (born != null) return `born ${year(born)}`;
  return "";
}

type FestivalData = { month?: number | null; day_start?: number | null; day_end?: number | null; end_month?: number | null };

/** "Nisan 15–21", or "Kislev 25 – Tevet 2" when a festival runs into the next month. */
export function festivalDate(d: FestivalData): string {
  if (!d.month) return "";
  const m = MONTHS[d.month - 1];
  const start = d.day_start ?? 1;
  if (d.end_month && d.end_month !== d.month) return `${m} ${start} – ${MONTHS[d.end_month - 1]} ${d.day_end ?? ""}`.trim();
  if (d.day_end && d.day_end !== start) return `${m} ${start}–${d.day_end}`;
  return `${m} ${start}`;
}
