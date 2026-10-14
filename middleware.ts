import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, authToken, isPublicPath, safeEqual } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const pw = process.env.SITE_PASSWORD;
  if (!pw || isPublicPath(req.nextUrl.pathname)) return NextResponse.next();
  if (safeEqual(req.cookies.get(AUTH_COOKIE)?.value, await authToken(pw, process.env.SITE_SECRET))) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!_next/static|_next/image).*)"] };
