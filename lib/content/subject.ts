import { formatRef } from "@/lib/books";
import { entryHref } from "./routes";

export function subjectHref(subject: string): string {
  const [kind, id] = [subject.slice(0, subject.indexOf(":")), subject.slice(subject.indexOf(":") + 1)];
  if (kind === "lemma") return `/word/${id}`;
  if (kind === "verse") return `/verse/${id}`;
  if (kind === "person") return `/history/people/${id}`;
  if (kind === "entry") {
    const [k, slug] = id.split("/");
    return entryHref(k, slug);
  }
  return "/";
}

export function subjectLabel(subject: string): string {
  const [kind, id] = [subject.slice(0, subject.indexOf(":")), subject.slice(subject.indexOf(":") + 1)];
  if (kind === "verse") return formatRef(id);
  if (kind === "entry") return id.split("/")[1].replace(/-/g, " ");
  return id;
}
