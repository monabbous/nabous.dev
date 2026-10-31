import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fetchContent, getPost, readProjects } from "../src/lib/project-content";

test("local registry paths are development-only, absolute, and mutually exclusive with GitHub sources", () => {
  const project = { slug: "example", path: "/absolute/project" };
  assert.deepEqual(readProjects({ NODE_ENV: "development", NABOUS_PROJECTS: JSON.stringify([project]) }), [project]);
  assert.throws(() => readProjects({ NODE_ENV: "production", NABOUS_PROJECTS: JSON.stringify([project]) }), /only in development/);
  assert.throws(() => readProjects({ NODE_ENV: "development", NABOUS_PROJECTS: JSON.stringify([{ ...project, path: "relative" }]) }), /absolute/);
  assert.throws(() => readProjects({ NODE_ENV: "development", NABOUS_PROJECTS: JSON.stringify([{ ...project, repository: "a/b", ref: "main" }]) }), /not both/);
});

test("local content updates without network requests and cannot escape public through symlinks", async () => {
  const directory = await mkdtemp(join(tmpdir(), "nabous-local-content-"));
  const nodeEnv = process.env.NODE_ENV;
  const fetch = globalThis.fetch;
  Object.assign(process.env, { NODE_ENV: "development" });
  globalThis.fetch = async () => { throw new Error("A local project must not use the network"); };
  try {
    await mkdir(join(directory, "public", "lab"), { recursive: true });
    await writeFile(join(directory, "public", "blog.md"), "---\ntitle: First version\n---\nBody");
    await writeFile(join(directory, "public", "lab", "index.html"), "<h1>Local lab</h1>");
    await writeFile(join(directory, "private.txt"), "Not public");
    await symlink(join(directory, "private.txt"), join(directory, "public", "escape.txt"));
    const project = { slug: "local", path: directory };
    assert.equal((await getPost(project))?.title, "First version");
    await writeFile(join(directory, "public", "blog.md"), "---\ntitle: Changed locally\n---\nBody");
    assert.equal((await getPost(project))?.title, "Changed locally");
    assert.equal(await (await fetchContent(project, ["lab", "index.html"])).text(), "<h1>Local lab</h1>");
    assert.equal((await fetchContent(project, ["missing.png"])).status, 404);
    assert.equal((await fetchContent(project, ["escape.txt"])).status, 404);
    await assert.rejects(fetchContent(project, ["..", "private.txt"]), /Invalid content path/);
    Object.assign(process.env, { NODE_ENV: "production" });
    await assert.rejects(fetchContent(project, ["blog.md"]), /only in development/);
  } finally {
    globalThis.fetch = fetch;
    if (nodeEnv === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
    else Object.assign(process.env, { NODE_ENV: nodeEnv });
    await rm(directory, { recursive: true, force: true });
  }
});
