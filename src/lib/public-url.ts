import type { Project } from "./project-content";

export function assetUrl(slug: string, source: string): string {
  if (/^(https?:|mailto:|#|\/)/i.test(source)) return source;
  return `/project-assets/${slug}/${source.replace(/^\.\//, "")}`;
}

export function projectSourceUrl(project: Project): string | undefined {
  if (!project.repository) return undefined;
  const directory = project.directory ? `/tree/${encodeURIComponent(project.ref ?? "HEAD")}/${project.directory.split("/").map(encodeURIComponent).join("/")}` : "";
  return `https://github.com/${project.repository}${directory}`;
}
