#!/usr/bin/env bash
# One-time host administration, separate from application deployment.
set -euo pipefail
[ "$(id -u)" = 0 ] || { echo 'Run as root on the production host.' >&2; exit 1; }
cd "$(dirname "$0")/.."
install -d /usr/local/lib/nabous-storage /etc/systemd/journald.conf.d
install -m 644 scripts/cleanup-server-images.py /usr/local/lib/nabous-storage/
install -m 644 ops/server-storage/nabous-storage.{service,timer} /etc/systemd/system/
install -m 644 ops/server-storage/80-nabous-storage.conf /etc/systemd/journald.conf.d/
install -m 644 ops/server-storage/nabous-incoming.conf /etc/tmpfiles.d/
systemd-analyze verify /etc/systemd/system/nabous-storage.{service,timer}
systemctl daemon-reload
systemctl restart systemd-journald
journalctl --rotate --vacuum-size=512M
systemctl enable --now nabous-storage.timer
echo 'Retention installed. Preview images with python3 /usr/local/lib/nabous-storage/cleanup-server-images.py'
