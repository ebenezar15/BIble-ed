import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/ui/Status";
import { NameView } from "./NameView";

export const metadata: Metadata = { title: "Name" };

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <NameView />
    </Suspense>
  );
}
