import type { MetadataRoute } from "next";
import { BASE_PATH } from "@/lib/href";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Logos Relational",
    short_name: "Logos",
    description: "Hebrew and Greek word and verse study through a relational-gospel lens",
    start_url: `${BASE_PATH}/`,
    scope: `${BASE_PATH}/`,
    display: "standalone",
    background_color: "#f2ead8",
    theme_color: "#7a4f00",
    icons: [
      { src: `${BASE_PATH}/icon.svg`, sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: `${BASE_PATH}/icon-maskable.svg`, sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
