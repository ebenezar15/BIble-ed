import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/ui/Status";
import { VerseView } from "./VerseView";

export const metadata: Metadata = { title: "Verse" };

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <VerseView />
    </Suspense>
  );
}
