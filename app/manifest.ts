import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Logos Relational",
    short_name: "Logos",
    description: "Hebrew and Greek word and verse study through a relational-gospel lens",
    start_url: "/",
    display: "standalone",
    background_color: "#f2ead8",
    theme_color: "#7a4f00",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
