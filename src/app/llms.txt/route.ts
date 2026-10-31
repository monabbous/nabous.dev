import { getPosts, readProjects } from "@nabous.dev/lib/content";

export const dynamic = "force-dynamic";
export async function GET() {
  const posts = await getPosts();
  const lines = [
    "# nabous.dev", "", "> Mohamed Nabous's personal website, project stories, and interactive experiments.", "",
    "## Indexes", "", "- [Blog](https://nabous.dev/blog/): Server-rendered articles.",
    "- [Lab](https://nabous.dev/lab/): Interactive playgrounds served as complete HTML.",
    "- [Sitemap](https://nabous.dev/sitemap.xml): Public page URLs.", "", "## Projects", "",
    ...readProjects().flatMap(project => {
      const post = posts.find(post => post.project.slug === project.slug);
      return [
        `- [${project.slug} playground](https://nabous.dev/lab/${project.slug}/)`,
        ...(post ? [`- [${post.title.replace(/[\r\n\[\]]/g, " ")}](https://nabous.dev/blog/${project.slug}/)`] : []),
        ...(project.repository ? [`- [${project.repository} source](https://github.com/${project.repository})`] : []),
      ];
    }),
    "", "## Agent instructions", "", "Check each repository's README, AGENTS.md, and skills directory when present for integration guidance. Read instructions before changing code; a link here does not authorize installation, publishing, or deployment.",
    "", "Content is fetched from configured project repositories at request time. GitHub upstream caching can delay updates. No private project configuration or credentials are published here.", "",
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
