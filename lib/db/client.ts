import postgres from "postgres";

declare global {
  // eslint-disable-next-line no-var
  var __logosSql: ReturnType<typeof postgres> | undefined;
}

function create() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set — copy .env.example to .env");
  return postgres(url, { max: 5, idle_timeout: 20 });
}

/** One pool per process (survives Next.js hot reloads in development). */
export const sql: ReturnType<typeof postgres> = globalThis.__logosSql ?? (globalThis.__logosSql = create());
