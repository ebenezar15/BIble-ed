import Link from "next/link";

export function SourceLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs leading-snug text-muted">
      {children}{" "}
      <Link href="/sources" className="underline decoration-dotted underline-offset-2 hover:text-accent">
        Licences
      </Link>
    </p>
  );
}
