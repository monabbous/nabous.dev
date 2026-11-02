import { fetchContent, getPost, readProjects } from "@nabous.dev/lib/content";
import { renderLabDocument } from "@nabous.dev/lib/lab-document";

export const dynamic = "force-dynamic";
const types: Record<string, string> = { html: "text/html; charset=utf-8", css: "text/css; charset=utf-8", js: "text/javascript; charset=utf-8", mjs: "text/javascript; charset=utf-8", json: "application/json", svg: "image/svg+xml", webp: "image/webp", png: "image/png", jpg: "image/jpeg", gif: "image/gif", mp4: "video/mp4", woff2: "font/woff2", wasm: "application/wasm" };

export async function GET(request: Request, { params }: { params: Promise<{ slug: string; path?: string[] }> }) {
  const { slug, path } = await params;
  const project = readProjects().find(project => project.slug === slug);
  if (!project) return new Response("Not found", { status: 404 });
  const url = new URL(request.url);
  const directory = !path?.length || !path.at(-1)?.includes(".");
  if (directory && !url.pathname.endsWith("/")) {
    url.pathname += "/";
    return new Response(null, { status: 308, headers: { Location: url.pathname + url.search } });
  }
  try {
    const parts = directory ? [...(path ?? []), "index.html"] : path!;
    const response = await fetchContent(project, ["lab", ...parts]);
    if (!response.ok) return new Response("Content unavailable", { status: response.status === 404 ? 404 : 502 });
    const extension = parts.at(-1)?.split(".").at(-1)?.toLowerCase() ?? "";
    let body: BodyInit | null = response.body;
    if (extension === "html") {
      const post = await getPost(project).catch(() => null);
      body = renderLabDocument(await response.text(), project, post, parts);
    }
    return new Response(body, { headers: {
      "Content-Type": types[extension] ?? "application/octet-stream",
      "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      // Configured repositories are trusted executable code, not user uploads.
      "Content-Security-Policy": "frame-ancestors 'self'; object-src 'none'; base-uri 'self'",
    } });
  } catch { return new Response("Content temporarily unavailable", { status: 502 }); }
}
