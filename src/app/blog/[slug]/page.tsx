import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import { assetUrl, BlogNav, PostDate } from "@nabous.dev/components/Blog";
import { getPost, readProjects } from "@nabous.dev/lib/content";
import { remarkHeadingIds } from "@nabous.dev/lib/markdown-headings";
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
  return <main className="blog-shell"><BlogNav /><article className="glassmorph rounded-glass blog-article">
    <header>{post.cover && <img className="blog-cover" src={assetUrl(slug, post.cover)} alt="" width="960" height="540" />}<h1 className="glassmorphism-text">{post.title}</h1>{post.description && <p className="blog-dek glassmorphism-text">{post.description}</p>}<PostDate value={post.updatedAt} /><Link className="blog-playground-link glassmorphism-text" href={`/lab/${slug}/`}>Open the playground →</Link></header>
    <div className="blog-prose"><ReactMarkdown remarkPlugins={[remarkGfm, remarkHeadingIds]} urlTransform={source => {
      const safe = defaultUrlTransform(source);
      return safe ? assetUrl(slug, safe) : "";
    }} components={{
      p: ({ children }) => <p className="glassmorphism-text">{children}</p>,
      li: ({ children }) => <li className="glassmorphism-text">{children}</li>,
      strong: ({ children }) => <strong className="glassmorphism-text">{children}</strong>,
      em: ({ children }) => <em className="glassmorphism-text">{children}</em>,
      blockquote: ({ children }) => <blockquote className="glassmorphism-text">{children}</blockquote>,
      th: ({ children }) => <th className="glassmorphism-text">{children}</th>,
      td: ({ children }) => <td className="glassmorphism-text">{children}</td>,
      a: ({ children, href }) => <a className="glassmorphism-text" href={href}>{children}</a>,
      h1: ({ children, id }) => <h2 id={id} className="glassmorphism-text">{children}</h2>,
      h2: ({ children, id }) => <h2 id={id} className="glassmorphism-text">{children}</h2>,
      h3: ({ children, id }) => <h3 id={id} className="glassmorphism-text">{children}</h3>,
      h4: ({ children, id }) => <h4 id={id} className="glassmorphism-text">{children}</h4>,
      h5: ({ children, id }) => <h5 id={id} className="glassmorphism-text">{children}</h5>,
      h6: ({ children, id }) => <h6 id={id} className="glassmorphism-text">{children}</h6>,
    }}>{post.markdown}</ReactMarkdown></div>
  </article><p><Link href="/blog/">← All articles</Link></p></main>;
}
