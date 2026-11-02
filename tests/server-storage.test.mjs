import test from "node:test";
import { execFileSync } from "node:child_process";

test("server image retention preserves deployed, spare, recent, manual and unrelated images", () => {
  execFileSync("python3", ["-B", "-c", `
import importlib.util, datetime as dt, json
spec = importlib.util.spec_from_file_location("cleanup", "scripts/cleanup-server-images.py")
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
now = dt.datetime(2026, 11, 2, tzinfo=dt.timezone.utc)
repo = m.REPOSITORIES[0]
def image(char, days, tags=None):
    return {"Id": char, "Created": (now - dt.timedelta(days=days)).isoformat(),
            "RepoTags": tags if tags is not None else [repo + ":" + char * 40]}
images = [image("a", 40), image("b", 10), image("c", 11), image("d", 20),
          image("e", 21, [repo + ":" + "e" * 40, repo + ":" + "f" * 40]),
          image("manual", 50, [repo + ":manual"]),
          image("other", 50, ["unrelated:" + "a" * 40])]
expected = [(repo + ":" + char * 40, "e" if char == "f" else char) for char in "def"]
assert m.candidates(images, {"a"}, now) == expected
assert m.candidates([image(c, i + 1) for i, c in enumerate("abcd")], set(), now) == []
assert m.candidates([], set(), now) == []
# All container references (including stopped containers) are read, and a newly
# referenced image is protected even if it was unused during selection.
calls = []
def docker(*args):
    calls.append(args)
    if args[:2] == ("image", "ls"): return "d"
    if args[:2] == ("image", "inspect"): return json.dumps([image("d", 20)])
    if args == ("ps", "-aq"): return "stopped running"
    if args[0] == "inspect": return json.dumps([{"Image": "d"}, {"Image": "a"}])
    raise AssertionError(args)
m.docker = docker
m.candidates = lambda *args: [(repo + ":" + "d" * 40, "d")]
m.cleanup(apply=True)
assert not any(call[:2] == ("image", "rm") for call in calls)
`], { stdio: "pipe" });
});
