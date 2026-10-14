"use client";

import { BlockList, groupBySection, SECTION_TITLES } from "@/components/content/Block";
import { StudyCard } from "@/components/word/StudyCard";
import type { BlockView } from "@/lib/data/types";
import { mergeBlocks } from "@/lib/local/merge";
import { useEdits } from "@/lib/local/store";

/** The library's blocks for a subject, with this browser's edits applied. */
export function useBlocks(subject: string, blocks: BlockView[]): BlockView[] {
  const edits = useEdits();
  return mergeBlocks(blocks, edits, subject);
}

/** One study card per section. */
export function BlockSections({
  subject,
  blocks,
  open = true,
  empty,
}: {
  subject: string;
  blocks: BlockView[];
  open?: boolean;
  empty?: React.ReactNode;
}) {
  const merged = useBlocks(subject, blocks);
  const sections = groupBySection(merged);
  if (!sections.length) return <>{empty}</>;
  return (
    <>
      {sections.map(([section, items]) => (
        <StudyCard key={section} title={SECTION_TITLES[section] ?? section} open={open}>
          <BlockList blocks={items} />
        </StudyCard>
      ))}
    </>
  );
}
