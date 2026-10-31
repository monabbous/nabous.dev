import test from "node:test";
import assert from "node:assert/strict";
import { GET as lab } from "../src/app/lab/[slug]/[[...path]]/route";
import { GET as asset } from "../src/app/project-assets/[slug]/[...path]/route";

test("runtime proxies preserve paths, MIME types, directory indexes, and failures", async () => {
  const fetch = globalThis.fetch;
  const env = process.env.NABOUS_PROJECTS;
  process.env.NABOUS_PROJECTS = JSON.stringify([{ slug: "slidebox", repository: "monabbous/slidebox", ref: "main" }]);
  const urls: string[] = [];
  globalThis.fetch = async input => { urls.push(String(input)); return new Response("asset content"); };
  try {
    const redirect = await lab(new Request("https://nabous.dev/lab/slidebox"), { params: Promise.resolve({ slug: "slidebox" }) });
    assert.equal(redirect.status, 308);
    assert.equal(redirect.headers.get("location"), "/lab/slidebox/");
    assert.equal(urls.length, 0);
    const index = await lab(new Request("https://nabous.dev/lab/slidebox/"), { params: Promise.resolve({ slug: "slidebox" }) });
    assert.match(index.headers.get("content-type")!, /text\/html/);
    assert.ok(urls.at(-1)?.endsWith("/public/lab/index.html"));
    const css = await lab(new Request("https://nabous.dev/lab/slidebox/style.css"), { params: Promise.resolve({ slug: "slidebox", path: ["style.css"] }) });
    assert.match(css.headers.get("content-type")!, /text\/css/);
    assert.equal(css.headers.get("cache-control"), "no-store");
    assert.equal(await css.text(), "asset content");
    const directory = await asset(new Request("https://nabous.dev/project-assets/slidebox/benchmarks/"), { params: Promise.resolve({ slug: "slidebox", path: ["benchmarks"] }) });
    assert.equal(directory.status, 200);
    assert.ok(urls.at(-1)?.endsWith("/public/benchmarks/index.html"));
    assert.match(directory.headers.get("content-type")!, /text\/html/);
    const missing = await lab(new Request("https://nabous.dev/lab/missing/"), { params: Promise.resolve({ slug: "missing" }) });
    assert.equal(missing.status, 404);
    globalThis.fetch = async () => new Response("Not found", { status: 404 });
    assert.equal((await lab(new Request("https://nabous.dev/lab/slidebox/"), { params: Promise.resolve({ slug: "slidebox" }) })).status, 404);
    globalThis.fetch = async () => { throw new Error("Network error"); };
    assert.equal((await lab(new Request("https://nabous.dev/lab/slidebox/"), { params: Promise.resolve({ slug: "slidebox" }) })).status, 502);
  } finally {
    globalThis.fetch = fetch;
    if (env === undefined) delete process.env.NABOUS_PROJECTS;
    else process.env.NABOUS_PROJECTS = env;
  }
});
