import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/ui/Status";
import { EditView } from "./EditView";

export const metadata: Metadata = { title: "Edit content" };

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <EditView />
    </Suspense>
  );
}
