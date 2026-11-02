/** One favicon source for Next.js metadata and server-rendered lab HTML. */
export const SITE_ICON = "/nabous-dev-logo.svg";
export const siteIcons = {
  icon: [{ url: SITE_ICON, type: "image/svg+xml" }, { url: "/icon", type: "image/png", sizes: "32x32" }],
  apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
} as const;
export const faviconLinks = [
  '<link rel="icon" href="' + SITE_ICON + '" type="image/svg+xml">',
  '<link rel="icon" href="/icon" type="image/png" sizes="32x32">',
  '<link rel="apple-touch-icon" href="/apple-icon" sizes="180x180">',
];
