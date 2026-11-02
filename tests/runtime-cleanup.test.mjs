import test from "node:test";
import { execFileSync } from "node:child_process";

test("runtime retention preserves live, rollback, mounted and unrelated containers and shared images", () => {
  execFileSync("python3", ["-B", "-c", `
import importlib.util, json
spec = importlib.util.spec_from_file_location("cleanup", "scripts/cleanup-runtime.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
def container(name, status="exited", mounts=None, image=None):
    return {"Id": name, "Name": "/" + name, "State": {"Status": status}, "Mounts": mounts or [], "Image": image or name}
items = [
    container("nabous-dev-runtime", "running"),
    container("nabous-dev-runtime-previous-40"),
    container("nabous-dev-runtime-previous-30"),
    container("nabous-dev-runtime-previous-20", mounts=[{"Type": "volume"}]),
    container("nabous-dev-runtime-previous-10", "running"),
    container("unrelated", image="shared"),
]
tags = {"nabous-dev-runtime:" + char * 40: image for char, image in [
    ("a", "nabous-dev-runtime"), ("b", "nabous-dev-runtime-previous-40"),
    ("c", "nabous-dev-runtime-previous-30"), ("d", "shared"), ("e", "unused")
]}
removed = []
def docker(*args):
    if args == ("ps", "-aq"): return " ".join(item["Id"] for item in items)
    if args[0] == "inspect": return json.dumps(items)
    if args[0] == "rm":
        removed.append(args)
        items[:] = [item for item in items if item["Id"] != args[1]]
        return args[1]
    if args[:2] == ("image", "ls"): return " ".join([*tags, "nabous-dev-runtime:manual"])
    if args[:2] == ("image", "inspect"): return json.dumps([{"Id": tags[args[2]]}])
    if args[:2] == ("image", "rm"):
        removed.append(args)
        del tags[args[2]]
        return args[2]
    raise AssertionError(args)
module.docker = docker
module.cleanup()
assert removed == [
    ("rm", "nabous-dev-runtime-previous-30"),
    ("image", "rm", "nabous-dev-runtime:" + "c" * 40),
    ("image", "rm", "nabous-dev-runtime:" + "e" * 40),
], removed
removed.clear()
module.cleanup()
assert removed == [], removed
`], { stdio: "pipe" });
});
