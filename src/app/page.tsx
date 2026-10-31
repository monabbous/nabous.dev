import Link from "next/link";
import Home from "@nabous.dev/components/Home";
import { PostCards } from "@nabous.dev/components/Blog";
import { getPosts } from "@nabous.dev/lib/content";
import "./blog/style.css";

export const dynamic = "force-dynamic";
export default async function HomePage() {
  const posts = await getPosts();
  return <Home recentBlog={<section id="blog" className="w-full max-w-4xl py-24 text-white scroll-mt-4">
    <h2 className="text-3xl font-bold text-white sm:text-4xl glassmorphism-text">Latest from the blog</h2>
    {posts.length ? <PostCards posts={posts.slice(0, 3)} /> : <p className="my-6">Articles are temporarily unavailable. Please check back soon.</p>}
    <Link className="inline-flex items-center gap-3 rounded-glass glassmorph glassmorph-border px-4 py-3 text-sm font-bold text-white shadow-lg hover:glassmorph-glow-opacity-30 transition-glassmorph" href="/blog/"><span className="glassmorphism-text">View all articles</span><i className="fa-solid fa-arrow-right glassmorphism-text" aria-hidden="true" /></Link>
  </section>} />;
}
