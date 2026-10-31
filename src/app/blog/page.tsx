import { BlogNav, PostCards } from "@nabous.dev/components/Blog";
import { getPosts } from "@nabous.dev/lib/content";
import "./style.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Blog | Mohamed Nabous", description: "Notes on building things for the web." };
export default async function BlogIndex() {
  const posts = await getPosts();
  return <main className="blog-shell"><BlogNav /><h1 className="glassmorphism-text">Blog</h1><p className="blog-dek">Notes on building things for the web.</p>{posts.length ? <PostCards posts={posts} /> : <p>No articles available right now. Please check back soon.</p>}</main>;
}
