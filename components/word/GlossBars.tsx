export function GlossBars({ glosses, total }: { glosses: { gloss: string; count: number }[]; total: number }) {
  if (!glosses.length) return <p className="text-muted">No glosses recorded.</p>;
  const max = glosses[0].count;
  return (
    <ul className="space-y-2">
      {glosses.map((g) => (
        <li key={g.gloss} className="grid grid-cols-[minmax(6rem,12rem)_1fr_auto] items-center gap-3 text-sm">
          <span className="truncate" title={g.gloss}>
            {g.gloss}
          </span>
          <span className="h-2.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
            <span className="block h-full rounded-full bg-accent" style={{ width: `${(g.count / max) * 100}%` }} />
          </span>
          <span className="tabular-nums text-muted">
            {g.count}
            <span className="sr-only"> of {total}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
