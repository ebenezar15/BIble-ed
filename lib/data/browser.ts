"use client";

import { BASE_PATH } from "@/lib/href";
import { makeApi } from "./api";

const cache = new Map<string, Promise<unknown>>();

/** In the browser: fetch data files once per page load and share them between components. */
export const data = makeApi(<T,>(file: string) => {
  if (!cache.has(file)) {
    const p = fetch(`${BASE_PATH}/data/${file}`).then((res) => {
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`Could not load ${file} (${res.status})`);
      return res.json() as Promise<unknown>;
    });
    p.catch(() => cache.delete(file)); // let a later attempt retry after a network failure
    cache.set(file, p);
  }
  return cache.get(file) as Promise<T | null>;
});
