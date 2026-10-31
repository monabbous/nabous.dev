import type { Post, Project } from "./project-content";
import { articleSocialImage } from "./content-metadata";

const escape = (value: string) => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

export function renderLabDocument(source: string, project: Project, post?: Post | null): string {
  const name = project.slug.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  const title = `${name} | nabous.dev`;
  const url = `https://nabous.dev/lab/${project.slug}/`;
  const descriptionTag = source.match(/<meta\b[^>]*\bname=["']description["'][^>]*>/i)?.[0];
  const description = descriptionTag?.match(/\bcontent=["']([^"']*)["']/i)?.[1] || `Explore the ${name} interactive playground.`;
  const social = post ? articleSocialImage(post) : undefined;
  const image = social?.url ?? "https://nabous.dev/nabous.webp";
  const meta = (key: string, value: string, property = false) => `<meta ${property ? "property" : "name"}="${key}" content="${escape(value)}">`;
  const head = [
    `<title>${escape(title)}</title>`, meta("description", description),
    `<link rel="canonical" href="${url}">`, '<link rel="icon" href="/nabous-dev-logo.svg" type="image/svg+xml">',
    '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">',
    '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    '<link rel="stylesheet" href="/lab-shell.css">',
    '<script type="module" src="/lab-light.js"></script>',
    meta("robots", "index,follow,max-image-preview:large"), meta("author", "Mohamed Nabous"),
    ...Object.entries({ "og:type": "website", "og:site_name": "nabous.dev", "og:title": title, "og:description": description, "og:url": url, "og:image": image, "og:image:alt": `${name} playground preview` }).map(([key, value]) => meta(key, value, true)),
    ...(social?.width && social?.height ? [meta("og:image:width", String(social.width), true), meta("og:image:height", String(social.height), true)] : []),
    meta("twitter:card", "summary_large_image"), meta("twitter:title", title), meta("twitter:description", description), meta("twitter:image", image), meta("twitter:image:alt", `${name} playground preview`),
    `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "WebApplication", name, description, url, image, author: { "@type": "Person", name: "Mohamed Nabous", url: "https://nabous.dev" } }).replace(/</g, "\\u003c")}</script>`,
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
