import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lyrixis",
    short_name: "Lyrixis",
    description: "Music. Understood.",
    start_url: "/",
    display: "standalone",
    background_color: "#07061a",
    theme_color: "#07061a",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
