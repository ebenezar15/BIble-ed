import type { Metadata } from "next";
import { PageIntro } from "@/components/content/EntryGrid";
import { AskBox } from "./AskBox";

export const metadata: Metadata = { title: "Ask the library" };

export default function AskPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 pb-24">
      <PageIntro title="Ask the library">
        Answers come only from this library: the lexicons, the Bible text, the Church Fathers and the word studies. Every
        claim is numbered back to its source. If the library doesn't cover it, the answer says so.
      </PageIntro>
      <AskBox />
    </main>
  );
}
