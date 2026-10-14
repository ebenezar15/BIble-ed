import type { Metadata } from "next";
import { PageIntro } from "@/components/content/EntryGrid";
import { NotesList } from "./NotesList";

export const metadata: Metadata = { title: "My notes" };

export default function NotesPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-24">
      <PageIntro title="My notes">
        Everything you've written, newest first. Add notes from any word, verse or library page.
      </PageIntro>
      <NotesList />
    </main>
  );
}
