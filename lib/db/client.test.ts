import { describe, expect, it } from "vitest";

describe("db client", () => {
  it("can be imported without DATABASE_URL (build time) and only fails when used", async () => {
    const saved = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    delete (globalThis as { __logosSql?: unknown }).__logosSql;
    try {
      const { sql } = await import("./client?nourl");
      expect(typeof sql).toBe("function");
      expect(() => sql`select 1`).toThrow(/DATABASE_URL/);
    } finally {
      process.env.DATABASE_URL = saved;
    }
  });
});
