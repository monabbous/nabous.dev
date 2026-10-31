import Link from "next/link";
import type { Post } from "@nabous.dev/lib/project-content";
import { assetUrl } from "@nabous.dev/lib/public-url";
export { assetUrl } from "@nabous.dev/lib/public-url";

export function PostCards({ posts, target = "blog" }: { posts: Pick<Post, "project" | "title" | "description" | "cover" | "updatedAt">[]; target?: "blog" | "lab" }) {
  return <div className="blog-cards">{posts.map(post => <Link className="blog-card rounded-glass glassmorph glassmorph-border hover:glassmorph-glow-opacity-30 transition-glassmorph text-left rtl:text-right" href={`/${target}/${post.project.slug}/`} key={post.project.slug}>
    {post.cover && <img src={assetUrl(post.project.slug, post.cover)} alt="" width="960" height="540" loading="lazy" />}
    <div className="p-4"><h3 className="font-semibold text-white glassmorphism-text">{post.title}</h3>{target === "blog" && <PostDate value={post.updatedAt} />}<p className="mt-2 text-xs leading-5 text-white/70 glassmorphism-text">{post.description}</p></div>
  </Link>)}</div>;
}

export function PostDate({ value }: { value: string | null }) {
  return value ? <p className="blog-date text-xs leading-5 text-white/60 glassmorphism-text">Updated <time dateTime={value}>{new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" }).format(new Date(value))}</time></p> : <p className="blog-date text-xs leading-5 text-white/60 glassmorphism-text">Commit date unavailable</p>;
}

export function BlogNav() {
  return <nav className="blog-nav"><Link href="/" className="blog-home"><i className="fa-solid fa-arrow-left" aria-hidden="true" /><span className="glassmorphism-text">nabous.dev</span></Link><div className="flex gap-6"><Link href="/lab/"><span className="glassmorphism-text">Lab</span></Link><Link href="/blog/"><span className="glassmorphism-text">Blog</span></Link></div></nav>;
}
