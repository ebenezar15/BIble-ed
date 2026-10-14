import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-5xl px-4 py-6 text-xs text-muted">
        Hebrew and Greek text, tagging and lexicons from{" "}
        <a href="https://www.STEPBible.org" className="underline">
          STEP Bible
        </a>{" "}
        (Tyndale House Cambridge), CC BY 4.0. Hebrew roots from the Open Scriptures Hebrew Bible Project, CC BY 4.0.
        English translations are public domain.{" "}
        <Link href="/sources" className="underline">
          All sources and licences
        </Link>
      </div>
    </footer>
  );
}
