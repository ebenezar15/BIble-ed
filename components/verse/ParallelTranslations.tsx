"use client";

import { useEffect, useState } from "react";

const STORAGE = "logos.primaryTranslation";

export function ParallelTranslations({ translations }: { translations: { id: string; name: string; text: string }[] }) {
  const [primary, setPrimary] = useState("kjv");
  useEffect(() => {
    try {
      setPrimary(localStorage.getItem(STORAGE) ?? "kjv");
    } catch {}
  }, []);
  const choose = (id: string) => {
    setPrimary(id);
    try {
      localStorage.setItem(STORAGE, id);
    } catch {}
  };
  const sorted = [...translations].sort((a, b) => Number(b.id === primary) - Number(a.id === primary));

  return (
    <div>
      <label className="text-sm text-muted">
        Read first in{" "}
        <select
          value={primary}
          onChange={(e) => choose(e.target.value)}
          className="ml-1 rounded border border-border bg-surface px-2 py-1 text-ink"
        >
          {translations.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <ul className="mt-4 space-y-4">
        {sorted.map((t, i) => (
          <li key={t.id} data-translation={t.id}>
            <p className={i === 0 ? "max-w-prose text-xl leading-relaxed" : "max-w-prose leading-relaxed"}>{t.text}</p>
            <p className="mt-1 text-xs text-muted">{t.name}</p>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted">
        All public domain. Copyrighted translations such as the ESV, NIV and NASB are not included.
      </p>
    </div>
  );
}
