import test from "node:test";
import assert from "node:assert/strict";
import { readProjects, contentPath, parseBlog, rawUrl, getPost, blogUpdatedAt } from "../src/lib/project-content";

const firstPartyProject = { slug: "remorse-chess", repository: "monabbous/nabous.dev", ref: "master", directory: "experiments/remorse-chess" };

test("checked-in projects coexist with the validated runtime registry", () => {
  assert.deepEqual(readProjects({}), [firstPartyProject]);
  const project = { slug: "slidebox", repository: "monabbous/slidebox", ref: "main" };
  assert.deepEqual(readProjects({ NABOUS_PROJECTS: JSON.stringify([project]) }), [project, firstPartyProject]);
  for (const input of [{}, [project, project], [{ ...project, slug: "../evil" }], [{ ...project, repository: "https://example.com" }], [{ ...project, ref: "" }]]) {
    assert.throws(() => readProjects({ NABOUS_PROJECTS: JSON.stringify(input) }));
  }
});

test("runtime overrides replace a first-party source without duplicating or hiding other projects", () => {
  const override = { slug: "remorse-chess", repository: "monabbous/remorse-chess", ref: "main" };
  const existing = { slug: "lumenmorph", repository: "monabbous/lumenmorph", ref: "main" };
  assert.deepEqual(readProjects({ NABOUS_PROJECTS: JSON.stringify([existing, override]) }), [existing, override]);
  const fifty = Array.from({ length: 50 }, (_, index) => ({ slug: `project-${index}`, repository: "a/b", ref: "main" }));
  assert.throws(() => readProjects({ NABOUS_PROJECTS: JSON.stringify(fifty) }), /combined project registry/);
});

test("repository subdirectories resolve content and reject ambiguous or escaping paths", () => {
  assert.equal(rawUrl(firstPartyProject, ["lab", "engine.js"]), "https://raw.githubusercontent.com/monabbous/nabous.dev/master/experiments/remorse-chess/public/lab/engine.js");
  for (const directory of ["", ".", "..", "/absolute", "experiments//game", "experiments/../game", "a\\b", "a/%2e%2e", "a?query", 12]) {
    assert.throws(() => readProjects({ NABOUS_PROJECTS: JSON.stringify([{ ...firstPartyProject, directory }]) }), /relative repository path/);
  }
  assert.throws(() => rawUrl(firstPartyProject, []), /Invalid content path/);
});

test("content paths cannot escape the configured public folder", () => {
  for (const parts of [[], [".."], ["."], ["a/b"], ["a\\b"], ["\0"]]) assert.throws(() => contentPath(parts));
  assert.equal(contentPath(["lab", "a b.css"]), "lab/a%20b.css");
  assert.equal(rawUrl({ slug: "x", repository: "a/b", ref: "feature/demo" }, ["blog.md"]), "https://raw.githubusercontent.com/a/b/feature%2Fdemo/public/blog.md");
});

test("blog frontmatter is data, not executable HTML", () => {
  const post = parseBlog('---\ntitle: "An article"\ncover_image: assets/cover.webp\n---\n\nHello **world**');
  assert.equal(post.title, "An article");
  assert.equal(post.cover, "assets/cover.webp");
  assert.ok(post.markdown.includes("Hello **world**"));
  assert.equal(parseBlog("# Heading\n\nBody").title, "Heading");
  assert.throws(() => parseBlog("No title"));
  assert.throws(() => parseBlog("---\n- invalid\n---\nBody"));
});

test("posts are fetched at request time and dates are scoped to the blog file", async () => {
  const original = globalThis.fetch;
  const cache = process.env.NABOUS_CONTENT_CACHE_SECONDS;
  const calls: { url: string; options?: RequestInit }[] = [];
  process.env.NABOUS_CONTENT_CACHE_SECONDS = "0";
  globalThis.fetch = async (input, options) => {
    const url = String(input);
    calls.push({ url, options });
    return url.startsWith("https://api.github.com/")
      ? Response.json([{ commit: { committer: { date: "2026-10-31T00:00:00Z" } } }])
      : new Response('---\ntitle: Runtime article\n---\n\nBody');
  };
  try {
    const project = { slug: "test", repository: "test/runtime-content", ref: "main" };
    const post = await getPost(project);
    assert.equal(post?.title, "Runtime article");
    assert.equal(post?.updatedAt, "2026-10-31T00:00:00Z");
    await getPost(project);
    assert.equal(calls.filter(call => call.url.includes("raw.githubusercontent.com")).length, 2);
    assert.equal(calls.filter(call => call.url.includes("api.github.com")).length, 1);
    assert.ok(calls.every(call => call.options?.cache === "no-store"));
    assert.ok(calls.some(call => call.url.includes("path=public%2Fblog.md")));
  } finally {
    globalThis.fetch = original;
    if (cache === undefined) delete process.env.NABOUS_CONTENT_CACHE_SECONDS;
    else process.env.NABOUS_CONTENT_CACHE_SECONDS = cache;
  }
});

test("GitHub date failures return unavailable rather than an invented date", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response("Rate limited", { status: 403 });
  try {
    assert.equal(await blogUpdatedAt({ slug: "limited", repository: "test/rate-limited", ref: "main" }), null);
  } finally { globalThis.fetch = original; }
});

test("article commit dates are independent for projects sharing a repository and ref", async () => {
  const original = globalThis.fetch;
  const paths: string[] = [];
  globalThis.fetch = async input => {
    const path = new URL(String(input)).searchParams.get("path")!;
    paths.push(path);
    return Response.json([{ commit: { committer: { date: path.includes("first") ? "2026-11-01T00:00:00Z" : "2026-11-02T00:00:00Z" } } }]);
  };
  try {
    const project = { slug: "date-test", repository: "test/shared-monorepo", ref: "main" };
    assert.equal(await blogUpdatedAt({ ...project, directory: "experiments/first" }), "2026-11-01T00:00:00Z");
    assert.equal(await blogUpdatedAt({ ...project, directory: "experiments/second" }), "2026-11-02T00:00:00Z");
    assert.deepEqual(paths, ["experiments/first/public/blog.md", "experiments/second/public/blog.md"]);
  } finally { globalThis.fetch = original; }
});
