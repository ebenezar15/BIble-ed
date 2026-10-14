import { NextResponse } from "next/server";
import { getOccurrences } from "@/lib/db/queries";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const lemma = p.get("lemma");
  if (!lemma || !/^[HG]\d{4,5}[A-Za-z]?$/.test(lemma)) {
    return NextResponse.json({ error: "Give a word id such as H2617A." }, { status: 400 });
  }
  const page = Math.max(0, Number(p.get("page")) || 0);
  const book = p.get("book") || undefined;
  return NextResponse.json(await getOccurrences(lemma, page, 50, book));
}
