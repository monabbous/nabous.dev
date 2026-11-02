import type { Metadata } from "next"
import { siteIcons } from "./site-icons"


export const metadata: Metadata = {
    metadataBase: new URL("https://nabous.dev"),
    icons: siteIcons,
    title: "Mohamed Nabous | Senior Software Developer",
    description: "Senior Fullstack Developer specialized in frontend, with 9 years' experience across 60+ diverse projects.",
    openGraph: {
        images: '/nabous.webp',
    },
} as const

export default metadata
