import { parse } from "yaml";

export type Project = { slug: string; repository: string; ref: string };
export type Post = { project: Project; title: string; description: string; cover?: string; updatedAt: string | null; markdown: string };

export function readProjects(env: { NABOUS_PROJECTS?: string } = { NABOUS_PROJECTS: process.env.NABOUS_PROJECTS }): Project[] {
  const value: unknown = JSON.parse(env.NABOUS_PROJECTS || "[]");
  if (!Array.isArray(value) || value.length > 50) throw new Error("NABOUS_PROJECTS must be an array of at most 50 projects");
  const slugs = new Set<string>();
  return value.map(entry => {
    if (!entry || typeof entry !== "object" || typeof entry.slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.slug) ||
      typeof entry.repository !== "string" || !/^[\w.-]+\/[\w.-]+$/.test(entry.repository) ||
      typeof entry.ref !== "string" || !entry.ref || /[\x00-\x1f]/.test(entry.ref) || entry.ref.length > 200 || slugs.has(entry.slug)) {
      throw new Error("Invalid or duplicate NABOUS_PROJECTS entry; expected slug, repository, and ref");
    }
    slugs.add(entry.slug);
    return { slug: entry.slug, repository: entry.repository, ref: entry.ref };
  });
}

export function contentPath(parts: string[]): string {
  if (!parts.length || parts.some(part => !part || part === "." || part === ".." || /[\\/\x00-\x1f]/.test(part))) throw new Error("Invalid content path");
  return parts.map(encodeURIComponent).join("/");
}

export function rawUrl(project: Project, parts: string[]): string {
  return `https://raw.githubusercontent.com/${project.repository}/${encodeURIComponent(project.ref)}/public/${contentPath(parts)}`;
}

function cacheSeconds(): number {
  const value = process.env.NABOUS_CONTENT_CACHE_SECONDS ?? "0";
  if (!/^\d+$/.test(value) || Number(value) > 86400) throw new Error("NABOUS_CONTENT_CACHE_SECONDS must be 0–86400");
  return Number(value);
}

export async function fetchContent(project: Project, parts: string[]): Promise<Response> {
  const seconds = cacheSeconds();
  return fetch(rawUrl(project, parts), {
    ...(seconds ? { next: { revalidate: seconds } } : { cache: "no-store" as const }),
    redirect: "error", signal: AbortSignal.timeout(12000),
  });
}

// Commit metadata is cached independently: unauthenticated GitHub API requests
// have a low rate limit. Never substitute the current time on failure.
const dates = new Map<string, { value: string | null; expires: number }>();
const pendingDates = new Map<string, Promise<string | null>>();
export async function blogUpdatedAt(project: Project): Promise<string | null> {
  const key = `${project.repository}@${project.ref}`;
  const cached = dates.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;
  const pending = pendingDates.get(key);
  if (pending) return pending;
  const request = (async () => {
    let value = cached?.value ?? null;
    let success = false;
    try {
      const query = new URLSearchParams({ path: "public/blog.md", sha: project.ref, per_page: "1" });
      const response = await fetch(`https://api.github.com/repos/${project.repository}/commits?${query}`, {
        cache: "no-store", signal: AbortSignal.timeout(8000), redirect: "error",
        headers: { Accept: "application/vnd.github+json", ...(process.env.NABOUS_GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.NABOUS_GITHUB_TOKEN}` } : {}) },
      });
      if (response.ok) {
        const commits = await response.json();
        const date = commits[0]?.commit?.committer?.date;
        value = typeof date === "string" && Number.isFinite(Date.parse(date)) ? date : null;
        success = true;
      }
    } catch { /* Preserve the last known commit date on upstream failure. */ }
    if (dates.size > 100) dates.clear();
    dates.set(key, { value, expires: Date.now() + (success ? 60000 : 300000) });
    return value;
  })();
  pendingDates.set(key, request);
  try { return await request; } finally { pendingDates.delete(key); }
}

export function parseBlog(source: string) {
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  const metadata = frontmatter ? parse(frontmatter[1], { maxAliasCount: 0 }) : {};
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) throw new Error("Invalid blog metadata");
  const markdown = frontmatter ? source.slice(frontmatter[0].length) : source;
  const title = typeof metadata.title === "string" ? metadata.title : markdown.match(/^# (.+)$/m)?.[1];
  if (!title) throw new Error("Blog requires a title");
  return { title, markdown, description: typeof metadata.description === "string" ? metadata.description : "", cover: typeof metadata.cover_image === "string" ? metadata.cover_image : undefined };
}

export async function getPost(project: Project): Promise<Post | null> {
  const response = await fetchContent(project, ["blog.md"]);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Blog upstream returned ${response.status}`);
  const source = await response.text();
  if (source.length > 1_000_000) throw new Error("Blog exceeds size limit");
  return { project, ...parseBlog(source), updatedAt: await blogUpdatedAt(project) };
}

export async function getPosts(): Promise<Post[]> {
  const results = await Promise.allSettled(readProjects().map(getPost));
  return results.flatMap(result => result.status === "fulfilled" && result.value ? [result.value] : [])
    .sort((a, b) => (Date.parse(b.updatedAt ?? "") || 0) - (Date.parse(a.updatedAt ?? "") || 0));
}
