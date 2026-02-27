import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FokusFeed OSS",
    short_name: "FokusFeed",
    start_url: "/digest",
    display: "standalone",
    background_color: "#f4f1e8",
    theme_color: "#176b5d",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png"
      }
    ]
  };
}
