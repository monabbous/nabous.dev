import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import { assetUrl, BlogNav, PostDate } from "@nabous.dev/components/Blog";
import { getPost, readProjects } from "@nabous.dev/lib/content";
import "../style.css";

export const dynamic = "force-dynamic";
const load = cache(async (slug: string) => {
  const project = readProjects().find(project => project.slug === slug);
  if (!project) notFound();
  const post = await getPost(project);
  if (!post) notFound();
  return post;
});
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await load(slug);
  return { title: `${post.title} | Mohamed Nabous`, description: post.description,
    alternates: { canonical: `https://nabous.dev/blog/${slug}/` },
    openGraph: { type: "article", title: post.title, description: post.description,
      ...(post.updatedAt ? { modifiedTime: post.updatedAt } : {}),
      ...(post.cover ? { images: [new URL(assetUrl(slug, post.cover), "https://nabous.dev").href] } : {}),
    } };
}
export default async function Article({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await load(slug);
  return <main className="blog-shell"><BlogNav /><article className="glassmorph blog-article">
    <header>{post.cover && <img className="blog-cover" src={assetUrl(slug, post.cover)} alt="" width="960" height="540" />}<h1>{post.title}</h1><PostDate value={post.updatedAt} /><Link href={`/lab/${slug}/`}>Open the playground →</Link></header>
    <div className="blog-prose"><ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={source => {
      const safe = defaultUrlTransform(source);
      return safe ? assetUrl(slug, safe) : "";
    }}>{post.markdown}</ReactMarkdown></div>
  </article><p><Link href="/blog/">← All articles</Link></p></main>;
}
