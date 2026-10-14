import { defineConfig, loadEnv } from "vite";
import path from "node:path";

export default defineConfig(({ mode }) => ({
  resolve: { alias: { "@": path.resolve(__dirname), "server-only": path.resolve(__dirname, "test/empty.ts") } },
  test: {
    include: ["lib/**/*.test.ts", "components/**/*.test.ts"],
    env: loadEnv(mode, process.cwd(), ""),
  },
}));
