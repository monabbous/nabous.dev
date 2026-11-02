#!/usr/bin/env python3
"""Keep the live runtime and newest rollback; remove only old website artifacts."""
import json
import re
import subprocess


def docker(*args):
    return subprocess.check_output(["docker", *args], text=True).strip()


def containers():
    ids = docker("ps", "-aq").split()
    return json.loads(docker("inspect", *ids)) if ids else []


def cleanup():
    previous = []
    for container in containers():
        match = re.fullmatch(r"/nabous-dev-runtime-previous-(\d+)", container["Name"])
        if match and container["State"]["Status"] == "exited":
            previous.append((int(match[1]), container))
    previous.sort(key=lambda item: item[0], reverse=True)
    for _, container in previous[1:]:
        # Never remove mounted data or force-remove a container that has restarted.
        if not container.get("Mounts"):
            print(docker("rm", container["Id"]))

    used_images = {container["Image"] for container in containers()}
    tags = docker("image", "ls", "nabous-dev-runtime", "--format", "{{.Repository}}:{{.Tag}}").split()
    for tag in tags:
        if not re.fullmatch(r"nabous-dev-runtime:[0-9a-f]{40}", tag):
            continue
        image = json.loads(docker("image", "inspect", tag))[0]
        if image["Id"] not in used_images:
            # Remove this repository's tag only, never force deletion of shared images.
            print(docker("image", "rm", tag))


if __name__ == "__main__":
    cleanup()
