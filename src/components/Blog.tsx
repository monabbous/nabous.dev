import Link from "next/link";
import type { Post } from "@nabous.dev/lib/project-content";

export function assetUrl(slug: string, source: string): string {
  if (/^(https?:|mailto:|#|\/)/i.test(source)) return source;
  return `/project-assets/${slug}/${source.replace(/^\.\//, "")}`;
}

export function PostCards({ posts }: { posts: Post[] }) {
  return <div className="blog-cards">{posts.map(post => <Link className="glassmorph rounded-glass blog-card" href={`/blog/${post.project.slug}/`} key={post.project.slug}>
    {post.cover && <img src={assetUrl(post.project.slug, post.cover)} alt="" width="960" height="540" loading="lazy" />}
    <div><h3>{post.title}</h3><PostDate value={post.updatedAt} /><p>{post.description}</p></div>
  </Link>)}</div>;
}

export function PostDate({ value }: { value: string | null }) {
  return value ? <p className="blog-date">Updated <time dateTime={value}>{new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" }).format(new Date(value))}</time></p> : <p className="blog-date">Commit date unavailable</p>;
}

export function BlogNav() {
  return <nav className="blog-nav"><Link href="/">Mohamed Nabous</Link><Link href="/blog/">Blog</Link></nav>;
}
