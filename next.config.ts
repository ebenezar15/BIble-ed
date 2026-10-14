import type { NextConfig } from "next";

// A static site: `npm run build` writes plain files to out/, which any static host can serve.
// For a sub-folder host (GitHub Pages serves https://<user>.github.io/<repo>/) set NEXT_PUBLIC_BASE_PATH=/<repo>.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
};

export default nextConfig;
