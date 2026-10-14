import { describe, expect, it } from "vitest";
import { authToken, isPublicPath } from "./auth";

describe("auth", () => {
  it("derives a stable token that differs per password", async () => {
    expect(await authToken("abc")).toBe(await authToken("abc"));
    expect(await authToken("abc")).not.toBe(await authToken("abd"));
    expect(await authToken("abc")).toMatch(/^[0-9a-f]{64}$/);
  });
  it("leaves login and static assets public", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/_next/static/x.js")).toBe(true);
    expect(isPublicPath("/manifest.webmanifest")).toBe(true);
    expect(isPublicPath("/word/H2617A")).toBe(false);
  });
});
