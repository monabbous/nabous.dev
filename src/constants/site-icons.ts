import type { Metadata } from "next";

/** One favicon source for Next.js metadata and server-rendered lab HTML. */
export const SITE_ICON = "/nabous-dev-logo.svg?v=2";
export const siteIcons = {
  icon: [{ url: SITE_ICON, type: "image/svg+xml" }, { url: "/icon?v=2", type: "image/png", sizes: "32x32" }],
  apple: [{ url: "/apple-icon?v=2", sizes: "180x180", type: "image/png" }],
} satisfies NonNullable<Metadata["icons"]>;
export const faviconLinks = [
  '<link rel="icon" href="' + SITE_ICON + '" type="image/svg+xml">',
  '<link rel="icon" href="/icon?v=2" type="image/png" sizes="32x32">',
  '<link rel="apple-touch-icon" href="/apple-icon?v=2" sizes="180x180">',
];
