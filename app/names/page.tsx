import type { Metadata } from "next";
import { Suspense } from "react";
import { PageIntro } from "@/components/content/EntryGrid";
import { NamesView } from "./NamesView";

export const metadata: Metadata = { title: "Names" };

export default function Page() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-24">
      <PageIntro title="Names">Every person and place named in the Bible, with the Hebrew or Greek behind the name and where it appears.</PageIntro>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <NamesView />
      </Suspense>
    </main>
  );
}
