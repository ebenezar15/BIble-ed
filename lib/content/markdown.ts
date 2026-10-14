import MarkdownIt from "markdown-it";
import { bookByName } from "@/lib/books";

const md = new MarkdownIt({ html: false, linkify: false, typographer: true });

// "Exod 34:6", "1 Cor 13:4–7", "Song of Songs 2:4", "II Kings 2:11" — book name, chapter:verse, optional range.
const REF =
  /\b((?:[1-3]|I{1,3})\s?)?([A-Z][a-z]+\.?(?:\s(?:of\s)?(?:Songs|Solomon))?)\s(\d{1,3}):(\d{1,3})(?:\s?[-–]\s?\d{1,3}(?::\d{1,3})?)?/g;
const LINK = /(\[[^\]]*\]\([^)]*\))/;

/** Turn written Scripture references into Markdown links to the verse page. */
export function linkifyRefs(src: string): string {
  return src
    .split(LINK)
    .map((part) =>
      LINK.test(part)
        ? part
        : part.replace(REF, (whole, num: string | undefined, name: string, ch: string, vs: string) => {
            const book = bookByName(`${num ?? ""}${name.replace(/\.$/, "")}`);
            return book ? `[${whole}](/verse/${book.id}.${Number(ch)}.${Number(vs)})` : whole;
          }),
    )
    .join("");
}

export function renderMarkdown(src: string): string {
  return md.render(linkifyRefs(src));
}
