import { describe, expect, it } from "vitest";
import { authToken, isPublicPath, safeEqual, safeNext } from "./auth";

describe("auth", () => {
  it("derives a stable token that differs per password", async () => {
    expect(await authToken("abc")).toBe(await authToken("abc"));
    expect(await authToken("abc")).not.toBe(await authToken("abd"));
    expect(await authToken("abc")).toMatch(/^[0-9a-f]{64}$/);
  });
  it("keys the token with the server secret when one is set", async () => {
    expect(await authToken("abc", "secret-1")).not.toBe(await authToken("abc"));
    expect(await authToken("abc", "secret-1")).not.toBe(await authToken("abc", "secret-2"));
    expect(await authToken("abc", "secret-1")).toBe(await authToken("abc", "secret-1"));
  });
  it("compares tokens without short-circuiting", () => {
    expect(safeEqual("abcd", "abcd")).toBe(true);
    expect(safeEqual("abcd", "abce")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(safeEqual(undefined, "abcd")).toBe(false);
  });
  it("leaves login and static assets public", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/_next/static/x.js")).toBe(true);
    expect(isPublicPath("/manifest.webmanifest")).toBe(true);
    expect(isPublicPath("/word/H2617A")).toBe(false);
  });

  it("only redirects to same-site paths after login", () => {
    expect(safeNext("/word/H2617A?x=1")).toBe("/word/H2617A?x=1");
    expect(safeNext("//evil.example/login")).toBe("/");
    expect(safeNext("/\\evil.example")).toBe("/");
    expect(safeNext("https://evil.example")).toBe("/");
    expect(safeNext("")).toBe("/");
  });
});
