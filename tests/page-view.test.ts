import test from "node:test";
import assert from "node:assert/strict";
import { navigationPageView } from "../src/lib/page-view";

test("initial and same-route renders do not duplicate the server-injected page view", () => {
  assert.equal(navigationPageView(null, "/blog/", "https://nabous.dev/blog/", "Blog"), null);
  assert.equal(navigationPageView("/blog/", "/blog/", "https://nabous.dev/blog/", "Blog"), null);
});

test("client route changes include the destination location, title, and existing GA property", () => {
  assert.deepEqual(navigationPageView("/blog/", "/blog/slidebox/", "https://nabous.dev/blog/slidebox/", "Slidebox story"), {
    send_to: "G-918ZJ86C13", page_location: "https://nabous.dev/blog/slidebox/", page_title: "Slidebox story",
  });
  assert.ok(navigationPageView("/blog/", "/blog/?topic=css", "https://nabous.dev/blog/?topic=css", "Blog"));
});
