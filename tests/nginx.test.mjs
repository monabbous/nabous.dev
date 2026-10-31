import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";

test("Nginx migration changes only the static fallback and is idempotent", () => {
  const directory = mkdtempSync(join(tmpdir(), "nabous-nginx-"));
  const file = join(directory, "site.conf");
  const source = `server {\nserver_name nabous.dev;\ninclude /etc/nginx/snippets/flying-whales.conf;\nlocation ^~ /reports/ { try_files $uri $uri/ =404; }\nlocation / {\nsub_filter_once on;\ntry_files $uri $uri/ $uri.html index.html;\n}\n}\n`;
  try {
    writeFileSync(file, source);
    execFileSync("python3", ["scripts/configure-nginx.py", file]);
    const changed = readFileSync(file, "utf8");
    assert.ok(changed.includes("proxy_pass http://127.0.0.1:3120;"));
    assert.ok(changed.includes("location ^~ /reports/ { try_files $uri $uri/ =404; }"));
    assert.ok(changed.includes("include /etc/nginx/snippets/flying-whales.conf;"));
    assert.ok(changed.includes("sub_filter_once on;"));
    execFileSync("python3", ["scripts/configure-nginx.py", file]);
    assert.equal(readFileSync(file, "utf8"), changed);
    writeFileSync(file, "unexpected routing");
    assert.throws(() => execFileSync("python3", ["scripts/configure-nginx.py", file], { stdio: "pipe" }));
    assert.equal(readFileSync(file, "utf8"), "unexpected routing");
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
