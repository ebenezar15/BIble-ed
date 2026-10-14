import { SourceLine } from "@/components/ui/SourceLine";
import { TypeChip, type ContentType } from "@/components/ui/TypeChip";

/**
 * A study section. On wide screens the content type and source sit in the margin,
 * like a scholar's marginal note; on phones they sit above the content.
 */
export function StudyCard({
  title,
  type,
  source,
  open = false,
  children,
  id,
}: {
  title: string;
  type: ContentType;
  source?: React.ReactNode;
  open?: boolean;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <details open={open} id={id} className="study group border-t border-border py-5">
      <summary className="flex cursor-pointer list-none items-center gap-3 md:pl-[12rem] [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden
          className="inline-block w-4 text-xl leading-none text-accent transition-transform duration-200 group-open:rotate-90 motion-reduce:transition-none"
        >
          ›
        </span>
        <h2 className="text-xl font-semibold">{title}</h2>
      </summary>
      <div className="md:grid md:grid-cols-[10rem_1fr] md:gap-x-8">
        <aside className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 md:mt-1 md:block md:space-y-2">
          <TypeChip type={type} />
          {source && <SourceLine>{source}</SourceLine>}
        </aside>
        <div className="mt-4 min-w-0 md:mt-0 md:pl-7">{children}</div>
      </div>
    </details>
  );
}
