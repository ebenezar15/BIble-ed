"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function NavMenu({ items }: { items: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  return (
    <div className="relative md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-label="Menu"
        onClick={() => setOpen((o) => !o)}
        className="flex size-9 items-center justify-center rounded-full border border-border"
      >
        <span aria-hidden className="text-lg leading-none">{open ? "×" : "≡"}</span>
      </button>
      {open && (
        <ul className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-border bg-surface py-1 shadow-lg">
          {items.map((i) => (
            <li key={i.href}>
              <Link href={i.href} className="block px-4 py-2 hover:bg-surface-2">
                {i.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
