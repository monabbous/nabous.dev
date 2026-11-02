#!/usr/bin/env python3
"""Retain deployed images and two spare releases in explicitly managed repositories."""
import argparse
import datetime as dt
import json
import re
import subprocess

REPOSITORIES = (
    "ghcr.io/monabbous/bofs-website",
    "ghcr.io/monabbous/nabous-websites",
    "ghcr.io/monabbous/flying-whales",
)


def docker(*args):
    return subprocess.check_output(["docker", *args], text=True).strip()


def used_images():
    ids = docker("ps", "-aq").split()
    return {c["Image"] for c in json.loads(docker("inspect", *ids))} if ids else set()


def candidates(images, used, now):
    result = []
    for repo in REPOSITORIES:
        releases = []
        for image in images:
            tags = [tag for tag in image.get("RepoTags") or []
                    if re.fullmatch(re.escape(repo) + r":[0-9a-f]{40}", tag)]
            if tags and image["Id"] not in used:
                created = dt.datetime.fromisoformat(image["Created"].replace("Z", "+00:00"))
                releases.append((created, image["Id"], tags))
        # Each image ID counts once, even if several commit tags point to it.
        releases.sort(reverse=True)
        for created, image_id, tags in releases[2:]:
            if now - created >= dt.timedelta(days=7):
                result.extend((tag, image_id) for tag in tags)
    return result


def cleanup(apply=False):
    ids = set()
    for repo in REPOSITORIES:
        ids.update(docker("image", "ls", "--quiet", "--no-trunc", repo).split())
    images = json.loads(docker("image", "inspect", *sorted(ids))) if ids else []
    for tag, image_id in candidates(images, used_images(), dt.datetime.now(dt.timezone.utc)):
        if not apply:
            print("Would remove", tag)
            continue
        # Recheck references and tag identity immediately before each removal.
        # This includes stopped containers; no containers or volumes are removed.
        if image_id in used_images():
            continue
        current = json.loads(docker("image", "inspect", tag))[0]
        if current["Id"] == image_id:
            print(docker("image", "rm", tag))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Remove candidates; default is dry-run")
    cleanup(parser.parse_args().apply)
