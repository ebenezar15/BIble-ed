import Link from "next/link";

export default function VerseNotFound() {
  return (
    <main className="mx-auto max-w-prose px-4 py-16">
      <h1 className="text-2xl font-semibold">We couldn't find that verse</h1>
      <p className="mt-3 text-muted">
        Check the chapter and verse numbers, or type the reference into search (for example “John 3:16” or “Ps 23”).
        Search will tell you how many chapters or verses a book has.
      </p>
      <Link href="/verse/Jhn.1.1" className="mt-6 inline-block underline">
        Open John 1:1
      </Link>
    </main>
  );
}
