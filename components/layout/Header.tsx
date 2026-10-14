import Link from "next/link";
import { ThemeStudio } from "@/components/theme/ThemeStudio";
import { NavMenu } from "./NavMenu";

export const NAV = [
  { href: "/explore", label: "Explore" },
  { href: "/ask", label: "Ask" },
  { href: "/notes", label: "My notes" },
];

export function Header({ search }: { search?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-baseline gap-1.5 font-semibold tracking-tight">
          <span lang="grc" className="text-xl text-greek">λ</span>
          <span className="hidden sm:inline">Logos Relational</span>
        </Link>
        <div className="min-w-0 flex-1">{search}</div>
        <nav aria-label="Main" className="hidden items-center gap-4 text-sm md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="hover:text-accent">
              {n.label}
            </Link>
          ))}
        </nav>
        <ThemeStudio />
        <NavMenu items={NAV} />
      </div>
    </header>
  );
}
