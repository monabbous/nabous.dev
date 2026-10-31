import { BlogNav, PostCards } from "@nabous.dev/components/Blog";
import { getPosts } from "@nabous.dev/lib/content";
import type { Metadata } from "next";
import "./style.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Blog | Mohamed Nabous", description: "Notes on building things for the web.",
  alternates: { canonical: "https://nabous.dev/blog/" },
  openGraph: { type: "website", siteName: "nabous.dev", title: "Blog | Mohamed Nabous", description: "Notes on building things for the web.", url: "https://nabous.dev/blog/", images: ["/nabous.webp"] },
  twitter: { card: "summary_large_image", title: "Blog | Mohamed Nabous", description: "Notes on building things for the web.", images: ["/nabous.webp"] },
};
export default async function BlogIndex() {
  const posts = await getPosts();
  return <main className="blog-shell"><BlogNav /><h1 className="glassmorphism-text">Blog</h1><p className="blog-dek glassmorphism-text">Notes on building things for the web.</p>{posts.length ? <PostCards posts={posts} /> : <p>No articles available right now. Please check back soon.</p>}</main>;
}
