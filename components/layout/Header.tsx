import Link from "next/link";
import { ThemeStudio } from "@/components/theme/ThemeStudio";

export function Header({ search }: { search?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-baseline gap-1.5 font-semibold tracking-tight">
          <span lang="grc" className="text-xl text-greek">λ</span>
          <span className="hidden sm:inline">Logos Relational</span>
        </Link>
        <div className="min-w-0 flex-1">{search}</div>
        <ThemeStudio />
      </div>
    </header>
  );
}
