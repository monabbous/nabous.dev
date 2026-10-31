import { fetchContent, readProjects } from "@nabous.dev/lib/content";

export const dynamic = "force-dynamic";
const types: Record<string, string> = { webp: "image/webp", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", svg: "image/svg+xml", mp4: "video/mp4", json: "application/json", html: "text/html; charset=utf-8", css: "text/css; charset=utf-8", js: "text/javascript; charset=utf-8", mjs: "text/javascript; charset=utf-8", gz: "application/gzip" };
export async function GET(request: Request, { params }: { params: Promise<{ slug: string; path: string[] }> }) {
  const { slug, path } = await params;
  const project = readProjects().find(project => project.slug === slug);
  if (!project || path[0] === "blog.md") return new Response("Not found", { status: 404 });
  try {
    const parts = new URL(request.url).pathname.endsWith("/") ? [...path, "index.html"] : path;
    const response = await fetchContent(project, parts);
    if (!response.ok) return new Response("Content unavailable", { status: response.status === 404 ? 404 : 502 });
    return new Response(response.body, { headers: {
      "Content-Type": types[parts.at(-1)?.split(".").at(-1) ?? ""] ?? "application/octet-stream",
      "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "frame-ancestors 'self'; object-src 'none'; base-uri 'self'",
    } });
  } catch { return new Response("Content temporarily unavailable", { status: 502 }); }
}
