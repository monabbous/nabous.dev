#!/usr/bin/env bash
set -euo pipefail

: "${DEPLOY_SHA:?Missing commit SHA}"
: "${PROJECTS_BASE64:?Missing runtime project registry}"
[[ "$DEPLOY_SHA" =~ ^[0-9a-f]{40}$ ]] || exit 1
CONTENT_CACHE_SECONDS=${CONTENT_CACHE_SECONDS:-0}
[[ "$CONTENT_CACHE_SECONDS" =~ ^[0-9]+$ ]] && [ "$CONTENT_CACHE_SECONDS" -le 86400 ] || exit 1
export CONTENT_CACHE_SECONDS
APP=/opt/nabous.dev-runtime
NAME=nabous-dev-runtime
BACKUP="/opt/nabous.dev-runtime-backups/$(date -u +%Y%m%dT%H%M%SZ)-${DEPLOY_SHA:0:8}"
SITE=/etc/nginx/sites-enabled/nabous.dev.conf
mkdir -p "$APP" "$BACKUP"
chmod 700 "$BACKUP"
if [ ! -d "$APP/.git" ]; then
  git clone https://github.com/monabbous/nabous.dev.git "$APP"
fi
cd "$APP"
git fetch origin "$DEPLOY_SHA"
git switch --detach "$DEPLOY_SHA"
# Runtime configuration is deliberately absent from the Docker build.
docker build -t "nabous-dev-runtime:$DEPLOY_SHA" -f Dockerfile .
printf '%s' "$PROJECTS_BASE64" | base64 --decode > "$BACKUP/projects.json"
python3 - "$BACKUP/projects.json" "$BACKUP/runtime.env" <<'PY'
import json, pathlib, sys, os
projects = json.loads(pathlib.Path(sys.argv[1]).read_text())
if not isinstance(projects, list):
    raise SystemExit("Runtime registry must be a JSON array")
pathlib.Path(sys.argv[2]).write_text("NABOUS_PROJECTS=" + json.dumps(projects, separators=(",", ":")) + "\nNABOUS_CONTENT_CACHE_SECONDS=" + os.environ["CONTENT_CACHE_SECONDS"] + "\n")
PY
chmod 600 "$BACKUP/runtime.env"
cp -a "$SITE" "$BACKUP/nginx.conf"
OLD=""
NEW_STARTED=0
rollback() {
  code=$?
  if [ "$code" != 0 ]; then
    cp -a "$BACKUP/nginx.conf" "$SITE"
    nginx -t && systemctl reload nginx
    if [ "$NEW_STARTED" = 1 ]; then docker rm -f "$NAME"; fi
    if [ -n "$OLD" ]; then docker rename "$OLD" "$NAME"; docker start "$NAME"; fi
    echo "Deployment failed; restored previous routing/runtime. Backup: $BACKUP"
  fi
  exit "$code"
}
trap rollback EXIT
if docker container inspect "$NAME" >/dev/null 2>&1; then
  OLD="${NAME}-previous-$(date +%s)"
  docker stop "$NAME"
  docker rename "$NAME" "$OLD"
elif ss -ltn '( sport = :3120 )' | grep -q ':3120'; then
  echo 'Port 3120 belongs to another service; refusing to replace it.'
  exit 1
fi
docker run -d --name "$NAME" --restart unless-stopped --env-file "$BACKUP/runtime.env" \
  --security-opt no-new-privileges --cap-drop ALL \
  -p 127.0.0.1:3120:3000 "nabous-dev-runtime:$DEPLOY_SHA"
NEW_STARTED=1
# This checks only runtime health, never project content during deployment.
for attempt in $(seq 1 30); do
  if curl --fail --silent http://127.0.0.1:3120/health >/dev/null; then break; fi
  sleep 2
done
curl --fail --silent http://127.0.0.1:3120/health >/dev/null
python3 scripts/configure-nginx.py "$SITE"
nginx -t
systemctl reload nginx
curl --fail --silent --resolve nabous.dev:443:127.0.0.1 https://nabous.dev/health >/dev/null
printf '%s\n' "$DEPLOY_SHA" > "$BACKUP/deployed-sha"
echo "Runtime deployed. Previous container: ${OLD:-none}. Backup: $BACKUP"
