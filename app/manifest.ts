import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Macros",
    short_name: "Macros",
    description:
      "A mobile-first nutrition tracker for food logs, recipes, micronutrients, weight trends, and energy expenditure.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#faf9f5",
    theme_color: "#4b5547",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
