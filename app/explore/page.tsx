import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/content/EntryGrid";

export const metadata: Metadata = { title: "Explore" };

const MODULES = [
  { href: "/books", title: "Books of the Bible", text: "Authors, dates with the range of views, outlines and the Christ-centred reading.", glyph: "ספר" , lang: "he"},
  { href: "/jesus", title: "Words of Jesus", text: "Abba, basileia, metanoia, Gehenna: what his first hearers heard.", glyph: "אבא", lang: "he" },
  { href: "/parables", title: "Parables", text: "Village life, honour and shame, and the running father.", glyph: "παραβολή", lang: "grc" },
  { href: "/names", title: "Names", text: "Every person and place, with the Hebrew or Greek behind it.", glyph: "שֵׁם", lang: "he" },
  { href: "/torah", title: "Torah, worship and patterns", text: "Festivals, offerings, the tabernacle, covenants, types and chiasms.", glyph: "תּוֹרָה", lang: "he" },
  { href: "/history", title: "Church history and theology", text: "Fathers, councils, denominations and how doctrines developed.", glyph: "ἐκκλησία", lang: "grc" },
  { href: "/rome", title: "The Roman world", text: "Gospel, lord, assembly, adoption: the empire's words, read again.", glyph: "εὐαγγέλιον", lang: "grc" },
  { href: "/topics", title: "Studies", text: "Dating the New Testament, the canon, manuscripts.", glyph: "βίβλος", lang: "grc" },
  { href: "/ask", title: "Ask the library", text: "Questions answered only from this library, with sources.", glyph: "?", lang: undefined },
];

export default function Page() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-24">
      <PageIntro title="Explore">Everything in the library, by subject.</PageIntro>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m) => (
          <li key={m.href}>
            <Link href={m.href} className="group flex h-full flex-col rounded-xl border border-border bg-surface p-5 hover:border-accent">
              <span lang={m.lang} dir={m.lang === "he" ? "rtl" : undefined} className={`text-3xl ${m.lang === "he" ? "text-right text-hebrew" : "text-greek"}`}>{m.glyph}</span>
              <span className="mt-3 text-lg font-semibold group-hover:text-accent">{m.title}</span>
              <span className="text-sm text-muted">{m.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
