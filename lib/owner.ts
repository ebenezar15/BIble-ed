import "server-only";
import { cookies } from "next/headers";
import { AUTH_COOKIE, authToken, safeEqual } from "./auth";

/** True when this request comes from the owner. Without SITE_PASSWORD (local use) the owner is whoever runs it. */
export async function isOwner(): Promise<boolean> {
  const pw = process.env.SITE_PASSWORD;
  if (!pw) return true;
  const c = (await cookies()).get(AUTH_COOKIE)?.value;
  return safeEqual(c, await authToken(pw, process.env.SITE_SECRET));
}

export async function requireOwner(): Promise<void> {
  if (!(await isOwner())) throw new Error("Sign in to edit.");
}
