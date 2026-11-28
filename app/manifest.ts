import type { MetadataRoute } from "next";

// Installable PWA. Installed ("Add to Home Screen" / "Install app") it opens
// fullscreen, and unlike the Fullscreen API that survives full page loads
// (login with Google, logout, refresh) — meant for the POS/kiosk tablets.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "CafeSync",
    short_name: "CafeSync",
    description: "Cafe system powered by next.js",
    start_url: "/post-login",
    scope: "/",
    display: "fullscreen",
    display_override: ["fullscreen", "standalone"],
    background_color: "#1b140f",
    theme_color: "#1b140f",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
