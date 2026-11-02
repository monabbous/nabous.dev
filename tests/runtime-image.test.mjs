import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

for (const scenario of ["success", "bad-checksum", "load-failure", "wrong-revision"]) {
  test(`runtime image import: ${scenario}`, () => {
    const dir = mkdtempSync(join(tmpdir(), "runtime-image-"));
    try {
      const archive = join(dir, "release.tar.gz");
      const calls = join(dir, "calls");
      writeFileSync(archive, "test archive");
      writeFileSync(join(dir, "docker"), `#!/bin/sh
echo "$*" >> "$TEST_CALLS"
if [ "$1" = load ]; then
  [ "$TEST_SCENARIO" != load-failure ]
else
  if [ "$TEST_SCENARIO" = wrong-revision ]; then echo wrong; else echo "$DEPLOY_SHA"; fi
fi
`, { mode: 0o755 });
      const checksum = createHash("sha256").update("test archive").digest("hex");
      const result = spawnSync("bash", ["scripts/load-runtime-image.sh"], {
        encoding: "utf8",
        env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, TEST_CALLS: calls,
          TEST_SCENARIO: scenario, DEPLOY_SHA: "a".repeat(40), IMAGE_ARCHIVE: archive,
          IMAGE_SHA256: scenario === "bad-checksum" ? "b".repeat(64) : checksum },
      });
      assert.equal(result.status === 0, scenario === "success", result.stderr);
      assert.equal(existsSync(archive), false, "archive must be removed on success and failure");
      const commands = existsSync(calls) ? readFileSync(calls, "utf8") : "";
      if (scenario === "bad-checksum") assert.equal(commands, "");
      else assert.match(commands, /load --input/);
      if (scenario === "load-failure") assert.doesNotMatch(commands, /image inspect/);
      if (scenario === "success") assert.match(commands, /image inspect nabous-dev-runtime:a{40}/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}
