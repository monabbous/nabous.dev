import type { MetadataRoute } from "next";
import { getPosts, readProjects } from "@nabous.dev/lib/content";

export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPosts();
  return [
    ...["/", "/blog/", "/lab/"].map(path => ({ url: `https://nabous.dev${path}` })),
    ...posts.map(post => ({ url: `https://nabous.dev/blog/${post.project.slug}/`, ...(post.updatedAt ? { lastModified: post.updatedAt } : {}) })),
    ...readProjects().map(project => ({ url: `https://nabous.dev/lab/${project.slug}/` })),
  ];
}
