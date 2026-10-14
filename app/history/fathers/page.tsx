import type { Metadata } from "next";
import { Suspense } from "react";
import { PageIntro } from "@/components/content/EntryGrid";
import { FathersSearch } from "./FathersSearch";

export const metadata: Metadata = { title: "Search the Fathers" };

export default function Page() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-24">
      <PageIntro title="Search the Fathers" />
      <Suspense>
        <FathersSearch />
      </Suspense>
    </main>
  );
}
