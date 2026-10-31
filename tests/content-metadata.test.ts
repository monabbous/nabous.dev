import test from "node:test";
import assert from "node:assert/strict";
import { articleMetadata, articleStructuredData } from "../src/lib/content-metadata";
import { parseBlog, type Post } from "../src/lib/project-content";
import { renderLabDocument } from "../src/lib/lab-document";

const post: Post = { project: { slug: "slidebox", repository: "monabbous/slidebox", ref: "main" }, title: "A CSS story", description: "Native inputs and margins.", cover: "assets/cover.webp", socialImage: "assets/social.jpg", socialImageWidth: 1920, socialImageHeight: 1080, markdown: "Body", updatedAt: "2026-10-31T12:00:00Z" };

test("article metadata uses a static social image, canonical URL, and website icon", () => {
  const metadata = articleMetadata(post);
  assert.equal(metadata.alternates?.canonical, "https://nabous.dev/blog/slidebox/");
  assert.match(JSON.stringify(metadata.openGraph), /https:\/\/nabous.dev\/project-assets\/slidebox\/assets\/social.jpg/);
  assert.match(JSON.stringify(metadata.twitter), /summary_large_image/);
  assert.match(JSON.stringify(metadata.icons), /nabous-dev-logo.svg/);
  assert.equal(articleStructuredData(post).dateModified, post.updatedAt);
  assert.equal(articleStructuredData(post).image, "https://nabous.dev/project-assets/slidebox/assets/social.jpg");
});

test("frontmatter accepts optional social image dimensions without trusting invalid sizes", () => {
  const parsed = parseBlog('---\ntitle: Test\nsocial_image: assets/social.jpg\nsocial_image_width: 1920\nsocial_image_height: -1\n---\nBody');
  assert.equal(parsed.socialImage, "assets/social.jpg");
  assert.equal(parsed.socialImageWidth, 1920);
  assert.equal(parsed.socialImageHeight, undefined);
});

test("the host injects server-rendered lab chrome and metadata while preserving project content", () => {
  const html = renderLabDocument('<!doctype html><html><head><title>Project</title><meta name="description" content="Adjust native controls."><link rel="stylesheet" href="./style.css"></head><body><main><h1>Slidebox</h1><input type="checkbox"></main><script src="./script.js"></script></body></html>', post.project, post);
  const head = html.split("</head>")[0];
  assert.ok(head.includes('<meta property="og:image" content="https://nabous.dev/project-assets/slidebox/assets/social.jpg">'));
  assert.ok(head.includes('<meta name="twitter:card" content="summary_large_image">'));
  assert.ok(head.includes('href="/lab-shell.css"'));
  assert.ok(head.includes('href="https://nabous.dev/lab/slidebox/"'));
  assert.ok(head.includes("nabous-dev-logo.svg"));
  assert.ok(html.includes('data-nabous-shell'));
  assert.ok(html.includes('<h1>Slidebox</h1><input type="checkbox">'));
  assert.ok(html.includes('src="./script.js"'));
  assert.equal((head.match(/<title>/g) ?? []).length, 1);
});
