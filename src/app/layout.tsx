import { LumenPointer } from "@nabous.dev/components/LumenPointer";
import Providers from "@nabous.dev/providers";
import { Suspense } from "react";
import { PageViewTracker } from "@nabous.dev/components/PageViewTracker";
import "@nabous.dev/styles/globals.css";

export { metadata } from "@nabous.dev/constants/metadata";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="lumenmorph-motion">
      <body className={`antialiased !bg-[var(--colors__background)]`}>
        <LumenPointer />
        <Providers>{children}</Providers>
        <Suspense fallback={null}><PageViewTracker /></Suspense>
      </body>
    </html>
  );
}
