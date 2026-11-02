# Production storage retention

The November 2, 2026 audit found the 48 GB root disk at 98% usage, with less than
1 GB available. Docker reported 19.56 GB of images (13.28 GB reclaimable) and
2.45 GB of private build cache. System journals used 3.7 GB. The host pnpm store
used 2.8 GB. These categories overlap with directory totals; do not add Docker's
logical image sizes to filesystem usage.

BOFS had twelve release tags, most backed by separate 1.15 GB images. Its runtime
includes about 673 MB of node_modules and 234 MB of .next per release. Retention
was missing. A future BOFS standalone production image could reduce its baseline;
this change does not alter that application's build or deployment.

## Website deployment

GitHub Actions tests and builds the image, then transfers a gzip-compressed
`docker save` archive into a unique `/opt/nabous.dev-incoming/<run>-<attempt>/`
directory. The server validates the archive checksum and image revision before
stopping the current runtime. Both the loader and the workflow clean up the
archive on failure. System tmpfiles removes abandoned transfers after two days.

The website retains its live container and one rollback container. Its new
containers use Docker's local logging driver, capped at three 10 MB files.
No dependency installation or application compilation runs on the server.

## Host maintenance

These files are installed separately from normal website deployments:

```sh
sudo bash scripts/install-server-storage.sh
python3 /usr/local/lib/nabous-storage/cleanup-server-images.py  # dry-run
sudo systemctl start nabous-storage.service                   # apply now
```

The daily `nabous-storage.timer` applies retention to SHA-tagged images in exactly
three repositories: BOFS, Nabous Websites, and Flying Whales. It preserves every
image referenced by any running or stopped container, two newest unused image
IDs per repository, and images built within seven days. Other tags/repositories,
containers, and volumes are untouched. Image removals never use `--force`.

The same service removes unused BuildKit cache older than seven days toward a
512 MB budget. Recently used cache can exceed that budget. Journald is limited
to 512 MB on disk, 128 MB in memory and 30 days, with a 2 GB free-space reserve.
Installation rotates and vacuums older journals to apply the disk limit now.

Check retention and disk usage:

```sh
df -h /
docker system df
journalctl --disk-usage
systemctl list-timers nabous-storage.timer
journalctl -u nabous-storage.service -n 30
```

The host pnpm store and installed development tools are not automatically
deleted. Existing containers belonging to other applications are not recreated
to change their logging settings. Future services should declare log rotation
and image retention explicitly. Retention bounds disposable artifacts; databases
and application data still need capacity planning as they grow.
