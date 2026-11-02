import type { Post, Project } from "./project-content";
import { articleSocialImage } from "./content-metadata";
import { faviconLinks } from "../constants/site-icons";

const escape = (value: string) => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

export function renderLabDocument(source: string, project: Project, post?: Post | null, path: string[] = ["index.html"]): string {
  const name = project.slug.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  const decode = (value: string) => value.replace(/&(?:amp|quot|apos|lt|gt);/g, entity => ({ "&amp;": "&", "&quot;": '\"', "&apos;": "'", "&lt;": "<", "&gt;": ">" })[entity]!);
  const sourceMeta = (key: string) => {
    for (const tag of source.match(/<meta\b[^>]*>/gi) ?? []) {
      const attrs = Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])([\s\S]*?)\2/g)].map(match => [match[1].toLowerCase(), decode(match[3])]));
      if (attrs.name === key) return attrs.content;
    }
    return undefined;
  };
  const pageName = sourceMeta("lab:title") || name;
  const title = `${pageName} | nabous.dev`;
  const segments = path.map(encodeURIComponent);
  const documentPath = segments.at(-1) === "index.html" ? segments.slice(0, -1).join("/") + "/" : segments.join("/");
  const url = `https://nabous.dev/lab/${project.slug}/${documentPath === "/" ? "" : documentPath}`;
  const description = sourceMeta("description") || `Explore the ${name} interactive playground.`;
  const social = post ? articleSocialImage(post) : undefined;
  const pageImage = sourceMeta("lab:image");
  let candidate: URL | undefined;
  try { candidate = pageImage ? new URL(pageImage, url) : undefined; } catch { /* Invalid page metadata falls back to the project image. */ }
  const ownImage = candidate?.origin === "https://nabous.dev" && candidate.pathname.startsWith(`/lab/${project.slug}/`) ? candidate.href : undefined;
  const image = ownImage ?? social?.url ?? "https://nabous.dev/nabous.webp";
  const dimension = (key: string) => { const value = Number(sourceMeta(key)); return Number.isInteger(value) && value > 0 && value <= 8192 ? value : undefined; };
  const width = ownImage ? dimension("lab:image:width") : social?.width;
  const height = ownImage ? dimension("lab:image:height") : social?.height;
  const meta = (key: string, value: string, property = false) => `<meta ${property ? "property" : "name"}="${key}" content="${escape(value)}">`;
  const head = [
    `<title>${escape(title)}</title>`, meta("description", description),
    `<link rel="canonical" href="${url}">`, ...faviconLinks,
    ...(source.includes("assets/fontawesome/css/all.min.css") ? [] : ['<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">']),
    '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    '<link rel="stylesheet" href="/generated/lab-shell.css">',
    '<script type="module" src="/lab-light.js"></script>',
    meta("robots", "index,follow,max-image-preview:large"), meta("author", "Mohamed Nabous"),
    ...Object.entries({ "og:type": "website", "og:site_name": "nabous.dev", "og:title": title, "og:description": description, "og:url": url, "og:image": image, "og:image:alt": `${pageName} preview` }).map(([key, value]) => meta(key, value, true)),
    ...(width && height ? [meta("og:image:width", String(width), true), meta("og:image:height", String(height), true)] : []),
    meta("twitter:card", "summary_large_image"), meta("twitter:title", title), meta("twitter:description", description), meta("twitter:image", image), meta("twitter:image:alt", `${pageName} preview`),
    `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "WebApplication", name: pageName, description, url, image, author: { "@type": "Person", name: "Mohamed Nabous", url: "https://nabous.dev" } }).replace(/</g, "\\u003c")}</script>`,
  ].join("\n");
  const repositoryLink = project.repository ? `<a class="site-link" href="https://github.com/${escape(project.repository)}" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-github" aria-hidden="true"></i> Source</a>` : "";
  const header = `<header class="topbar lab-site-header" data-nabous-shell><a class="wordmark" href="/" aria-label="Back to nabous.dev"><img src="/nabous-dev-logo.svg" alt="" width="24" height="24">nabous.dev</a><nav class="studio-nav" aria-label="Website navigation"><a class="site-link" href="/lab/"><i class="fa-solid fa-flask" aria-hidden="true"></i> Lab</a><a class="site-link" href="/blog/${project.slug}/">Article</a>${repositoryLink}</nav></header>`;
  const footer = '<footer class="lab-site-footer" data-nabous-shell><a href="/">nabous.dev</a><a href="/lab/">All experiments</a><a href="/blog/">Blog</a></footer>';

  // Remove only old site chrome while repositories migrate to content-only HTML.
  // The project can still use its own semantic header inside its content.
  return source.replace(/<header class="topbar">[\s\S]*?<\/header>/i, "")
    .replace(/<script\b[^>]*src="\.\/playground\/glass\.mjs"[^>]*><\/script>/i, "")
    .replace(/<footer><a href="https:\/\/nabous\.dev"[^>]*>nabous\.dev<\/a><\/footer>/i, "")
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, "")
    .replace(/<meta\b[^>]*(?:name=["'](?:description|robots|author|twitter:[^"']+)["']|property=["']og:[^"']+["'])[^>]*>/gi, "")
    .replace(/<link\b[^>]*rel=["'](?:canonical|icon)["'][^>]*>/gi, "")
    .replace(/<\/head>/i, () => head + "\n</head>")
    .replace(/(<body\b[^>]*>)/i, match => match + header)
    .replace(/<\/body>/i, () => footer + "</body>");
}
