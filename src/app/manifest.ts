import type { MetadataRoute } from "next";
import { SITE_ICON } from "../constants/site-icons";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mohamed Nabous", short_name: "nabous.dev", start_url: "/", display: "standalone",
    icons: [{ src: SITE_ICON, type: "image/svg+xml", sizes: "any" }, { src: "/apple-icon", type: "image/png", sizes: "180x180" }],
  };
}
