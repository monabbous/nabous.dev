"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { navigationPageView } from "@nabous.dev/lib/page-view";

type AnalyticsWindow = Window & { gtag?: (...args: unknown[]) => void };

export function PageViewTracker() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const route = pathname + (search ? `?${search}` : "");
  const previous = useRef<string | null>(null);

  useEffect(() => {
    const last = previous.current;
    previous.current = route;
    if (last === null || last === route) return;
    // Wait for this committed route's metadata to update the document title.
    const frame = requestAnimationFrame(() => {
      const payload = navigationPageView(last, route, window.location.href, document.title);
      const analytics = window as AnalyticsWindow;
      // Reuse the existing consent/blocking behavior. Do not load a second tag,
      // bypass a blocked script, or send collect requests directly.
      if (payload && typeof analytics.gtag === "function") analytics.gtag("event", "page_view", payload);
    });
    return () => cancelAnimationFrame(frame);
  }, [route]);

  return null;
}
