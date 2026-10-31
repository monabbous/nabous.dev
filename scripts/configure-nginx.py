"""Change only the inspected site's static fallback; preserve every other route."""
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
source = path.read_text()
old = "try_files $uri $uri/ $uri.html index.html;"
marker = "# nabous-runtime-managed"
replacement = """# nabous-runtime-managed
        proxy_pass http://127.0.0.1:3120;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Accept-Encoding "";
        proxy_buffering off;
        proxy_read_timeout 60s;"""
if marker in source:
    if source.count(marker) != 1 or "proxy_pass http://127.0.0.1:3120;" not in source:
        raise SystemExit("Unexpected managed Nginx routing; inspect before deploying")
elif source.count(old) == 1 and "server_name nabous.dev;" in source:
    path.write_text(source.replace(old, replacement))
else:
    raise SystemExit("Static fallback does not match the inspected configuration")
