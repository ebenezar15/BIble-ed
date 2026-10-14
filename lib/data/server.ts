import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { makeApi } from "./api";

const ROOT = path.join(process.cwd(), "public", "data");
const cache = new Map<string, Promise<unknown>>();

/** Build-time reader: pre-rendered pages read the same data files the browser fetches. */
export const data = makeApi(<T,>(file: string) => {
  if (!cache.has(file)) {
    cache.set(
      file,
      readFile(path.join(ROOT, file), "utf8").then(
        (s) => JSON.parse(s) as unknown,
        (e: NodeJS.ErrnoException) => {
          if (e.code === "ENOENT") return null;
          throw e;
        },
      ),
    );
  }
  return cache.get(file) as Promise<T | null>;
});

/** generateStaticParams for an entry page: one page per entry of this kind. */
export function entryParams(kind: string) {
  return async () => (await data.listEntries(kind)).map((e) => ({ slug: e.slug }));
}
