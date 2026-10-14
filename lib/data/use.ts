"use client";

import { useEffect, useState } from "react";

export type Loaded<T> = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; value: T };

/** Run an async loader when its inputs change; stale results are dropped. */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[]): Loaded<T> {
  const [state, setState] = useState<Loaded<T>>({ status: "loading" });
  useEffect(() => {
    let live = true;
    setState({ status: "loading" });
    load().then(
      (value) => live && setState({ status: "ready", value }),
      (e: Error) => live && setState({ status: "error", message: e.message || "Something went wrong." }),
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

/** Keep the browser tab title in step with a client-rendered page. */
export function useTitle(title: string | null) {
  useEffect(() => {
    if (title) document.title = `${title} · Logos Relational`;
  }, [title]);
}
