import test from "node:test";
import assert from "node:assert/strict";
import { headingSlug, remarkHeadingIds } from "../src/lib/markdown-headings";

test("heading anchors support article punctuation and Arabic text", () => {
  assert.equal(headingSlug("The range is where I'm still experimenting"), "the-range-is-where-im-still-experimenting");
  assert.equal(headingSlug("TL;DR"), "tldr");
  assert.equal(headingSlug("Install the agent skill"), "install-the-agent-skill");
  assert.equal(headingSlug("أهلاً بالعالم"), "أهلا-بالعالم");
});

test("heading IDs use inline text, avoid collisions, and reset per document", () => {
  const heading = (text: string) => ({ type: "heading", children: [{ type: "text", value: text }], data: { hProperties: {} as { id?: string } } });
  const headings = [heading("Setup"), heading("Setup"), heading("Setup-1"), heading("Setup")];
  const transform = remarkHeadingIds();
  transform({ type: "root", children: headings });
  assert.deepEqual(headings.map(node => node.data.hProperties.id), ["setup", "setup-1", "setup-1-1", "setup-2"]);
  const next = heading("Setup");
  transform({ type: "root", children: [next] });
  assert.equal(next.data.hProperties.id, "setup");
});
