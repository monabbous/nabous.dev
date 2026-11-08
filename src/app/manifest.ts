import type { MetadataRoute } from "next";
import { SITE_ICON } from "../constants/site-icons";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mohamed Nabous", short_name: "nabous.dev", start_url: "/", display: "standalone",
    background_color: "#f7f6f2", theme_color: "#171715",
    icons: [{ src: SITE_ICON, type: "image/svg+xml", sizes: "any" }, { src: "/apple-icon?v=2", type: "image/png", sizes: "180x180" }],
  };
}
