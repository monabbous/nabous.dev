export const GA_MEASUREMENT_ID = "G-918ZJ86C13";

export function navigationPageView(previous: string | null, current: string, location: string, title: string) {
  // Nginx's existing gtag config owns the initial document page_view.
  // React Strict Mode and same-route renders must not add another event.
  if (previous === null || previous === current) return null;
  return { send_to: GA_MEASUREMENT_ID, page_location: location, page_title: title };
}
