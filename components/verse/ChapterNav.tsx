"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Previous/next links, keyboard arrows and horizontal swipe on touch screens. */
export function ChapterNav({ prev, next }: { prev?: string; next?: string }) {
  const router = useRouter();
  useEffect(() => {
    let x0: number | null = null;
    let y0 = 0;
    const start = (e: TouchEvent) => {
      x0 = e.touches[0].clientX;
      y0 = e.touches[0].clientY;
    };
    const end = (e: TouchEvent) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      const dy = e.changedTouches[0].clientY - y0;
      x0 = null;
      if (Math.abs(dx) < 80 || Math.abs(dy) > Math.abs(dx) / 2) return;
      if (dx < 0 && next) router.push(`/verse/${next}`);
      if (dx > 0 && prev) router.push(`/verse/${prev}`);
    };
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input, textarea, select")) return;
      if (e.key === "ArrowRight" && next) router.push(`/verse/${next}`);
      if (e.key === "ArrowLeft" && prev) router.push(`/verse/${prev}`);
    };
    window.addEventListener("touchstart", start, { passive: true });
    window.addEventListener("touchend", end);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("touchstart", start);
      window.removeEventListener("touchend", end);
      window.removeEventListener("keydown", key);
    };
  }, [prev, next, router]);

  const cls = "rounded-full border border-border px-3 py-1.5 text-sm hover:border-accent";
  return (
    <nav aria-label="Verse navigation" className="flex gap-2">
      {prev ? (
        <Link href={`/verse/${prev}`} aria-label="Previous verse" className={cls}>
          ‹ Prev
        </Link>
      ) : (
        <span className={`${cls} opacity-40`}>‹ Prev</span>
      )}
      {next ? (
        <Link href={`/verse/${next}`} aria-label="Next verse" className={cls}>
          Next ›
        </Link>
      ) : (
        <span className={`${cls} opacity-40`}>Next ›</span>
      )}
    </nav>
  );
}
