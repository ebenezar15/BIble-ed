import Link from "next/link";

export default function WordNotFound() {
  return (
    <main className="mx-auto max-w-prose px-4 py-16">
      <h1 className="text-2xl font-semibold">No word with that number</h1>
      <p className="mt-3 text-muted">
        Word pages use STEP's Strong's numbers, such as H2617A or G0026. Search for the word instead: Hebrew, Greek, a
        transliteration or an English meaning all work.
      </p>
      <Link href="/search?q=hesed" className="mt-6 inline-block underline">
        Try a search for hesed
      </Link>
    </main>
  );
}
