import { NextResponse } from "next/server";
import { formatRef } from "@/lib/books";
import { runSearch } from "@/lib/search/run";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (q.trim().length < 2) return NextResponse.json({ items: [] });
  try {
    const r = await runSearch(q);
    if (r.redirect) {
      const target = r.redirect.split("/").pop()!;
      const title = r.redirect.startsWith("/verse/") ? formatRef(target) : target;
      return NextResponse.json({ items: [{ href: r.redirect, title, subtitle: "Open" }] });
    }
    const items = r.groups.flatMap((g) => g.items.slice(0, g.module === "Words" ? 6 : 3)).slice(0, 8);
    return NextResponse.json({ items, notice: r.notice });
  } catch {
    return NextResponse.json({ items: [], notice: "Search is unavailable right now." }, { status: 503 });
  }
}
