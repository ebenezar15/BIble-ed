import postgres from "postgres";

type Sql = ReturnType<typeof postgres>;

declare global {
  // eslint-disable-next-line no-var
  var __logosSql: Sql | undefined;
}

function instance(): Sql {
  if (globalThis.__logosSql) return globalThis.__logosSql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set — copy .env.example to .env (or set it in your host's settings)");
  // Neon's pooled endpoints ("-pooler" hosts) run PgBouncer in transaction mode: no prepared statements there.
  const pooled = /-pooler\./.test(url);
  globalThis.__logosSql = postgres(url, { max: 5, idle_timeout: 20, connect_timeout: 15, prepare: !pooled });
  return globalThis.__logosSql;
}

/**
 * One pool per process, created on first use so the app can be built without a database
 * (e.g. on Vercel before DATABASE_URL is set). Survives Next.js hot reloads in development.
 */
export const sql: Sql = new Proxy(function () {} as unknown as Sql, {
  apply: (_t, _this, args) => (instance() as unknown as (...a: unknown[]) => unknown)(...args),
  get: (_t, prop) => {
    const target = instance() as unknown as Record<PropertyKey, unknown>;
    const value = target[prop];
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(target) : value;
  },
});
