#!/usr/bin/env bash
set -euo pipefail

: "${DEPLOY_SHA:?Missing commit SHA}"
: "${IMAGE_ARCHIVE:?Missing CI image archive}"
: "${IMAGE_SHA256:?Missing CI image checksum}"
[[ "$DEPLOY_SHA" =~ ^[0-9a-f]{40}$ ]] || exit 1
[[ "$IMAGE_SHA256" =~ ^[0-9a-f]{64}$ ]] || exit 1
[[ -f "$IMAGE_ARCHIVE" && ! -L "$IMAGE_ARCHIVE" ]] || exit 1

# The archive is disposable. Remove it even if validation or Docker loading fails.
trap 'rm -f -- "$IMAGE_ARCHIVE"' EXIT
actual=$(sha256sum "$IMAGE_ARCHIVE")
[[ "${actual%% *}" = "$IMAGE_SHA256" ]] || { echo 'CI image checksum mismatch.' >&2; exit 1; }
docker load --input "$IMAGE_ARCHIVE"
revision=$(docker image inspect "nabous-dev-runtime:$DEPLOY_SHA" \
  --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')
[[ "$revision" = "$DEPLOY_SHA" ]] || { echo 'CI image revision mismatch.' >&2; exit 1; }
