import { BlogNav, PostCards } from "@nabous.dev/components/Blog";
import { getPosts, readProjects } from "@nabous.dev/lib/content";
import type { Metadata } from "next";
import "../blog/style.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Lab | Mohamed Nabous", description: "Interactive experiments and playgrounds by Mohamed Nabous.",
  alternates: { canonical: "https://nabous.dev/lab/" },
  openGraph: { type: "website", siteName: "nabous.dev", url: "https://nabous.dev/lab/", title: "Lab | Mohamed Nabous", description: "Interactive experiments and playgrounds by Mohamed Nabous.", images: ["/nabous.webp"] },
  twitter: { card: "summary_large_image", title: "Lab | Mohamed Nabous", description: "Interactive experiments and playgrounds by Mohamed Nabous.", images: ["/nabous.webp"] },
};

export default async function LabIndex() {
  const posts = await getPosts();
  const labs = readProjects().map(project => {
    const post = posts.find(post => post.project.slug === project.slug);
    const title = project.slug.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
    return { project, title, description: `Open the ${title} playground and try the experiment.`, cover: post?.cover, updatedAt: null };
  });
  return <main className="blog-shell"><BlogNav /><h1 className="lumenmorph-text">Lab</h1><p className="blog-dek lumenmorph-text">Interactive projects and experiments.</p>{labs.length ? <PostCards posts={labs} target="lab" /> : <p className="lumenmorph-text">No experiments are configured right now.</p>}</main>;
}
