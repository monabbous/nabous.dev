import { Metadata } from "next"


export const metadata: Metadata = {
    metadataBase: new URL("https://nabous.dev"),
    icons: '/nabous-dev-logo.svg',
    title: "Mohamed Nabous | Senior Software Developer",
    description: "Senior Fullstack Developer specialized in frontend, with 9 years' experience across 60+ diverse projects.",
    openGraph: {
        images: '/nabous.webp',
    },
} as const

export default metadata
