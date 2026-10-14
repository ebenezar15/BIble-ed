import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/ui/Status";
import { WordView } from "./WordView";

export const metadata: Metadata = { title: "Word study" };

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <WordView />
    </Suspense>
  );
}
