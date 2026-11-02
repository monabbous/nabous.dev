# Configure request-time project content

You need a Next.js server or the standalone Docker image. Static export does not support these routes.

## Set runtime environment variables

Set these variables on the running server, not as Docker build arguments:

```sh
NABOUS_PROJECTS='[{"slug":"slidebox","repository":"monabbous/slidebox","ref":"main"}]'
NABOUS_CONTENT_CACHE_SECONDS=0
```

`NABOUS_PROJECTS` accepts up to 50 unique slugs. Each entry requires a slug, a GitHub `owner/repository`, and a branch, tag, or commit ref. No application registry file is required. Public repositories need no credentials.

Changing these variables requires a process/container restart, not a rebuild. Changing project content requires neither a rebuild nor a restart.

## Use a local checkout in development

Run the development server with a filesystem source instead of a GitHub source:

```sh
NABOUS_PROJECTS='[{"slug":"slidebox","path":"/absolute/path/to/slidebox"}]' pnpm dev
```

The path must point to the repository root containing `public/`, not to the public folder itself. The development server reads files on every request without contacting GitHub, and uses local Git history for the last commit affecting `public/blog.md`. Uncommitted content changes appear immediately; the displayed commit date still describes the last commit. A non-Git folder has no commit date.

Local sources are accepted only when `NODE_ENV=development`. They are rejected in production, cannot be combined with `repository`/`ref` in the same entry, and cannot follow a requested symlink outside the project's public directory. Use GitHub-backed entries for deployment. See `.env.example`; copy the appropriate setting into your local environment without committing personal `.env` files.

## Add content to a project

Commit these files in the configured repository:

```text
public/
  blog.md
  assets/cover.webp
  lab/
    index.html
    style.css
    script.js
```

Use frontmatter for article metadata:

```markdown
---
title: My project story
description: How I built the project.
cover_image: assets/cover.webp
social_image: assets/social.jpg
social_image_width: 1920
social_image_height: 1080
---

Write the article in Markdown.
```

`/blog/<slug>/` renders Markdown with the site's typography, glass styling, and navigation. Raw HTML is not enabled. Relative article media URLs resolve through `/project-assets/<slug>/`. The homepage shows the three most recently updated available articles; `/blog/` shows the full index.

`/lab/` lists configured project playgrounds. `/lab/<slug>/` serves `public/lab/index.html` inside the website's server-rendered shell. The website owns the header/footer, Font Awesome, fonts, `src/styles/lab-shell.css` (compiled to `public/generated/lab-shell.css`), pointer lighting, favicon, canonical URL, and social metadata. The project supplies its content, controls, and functional CSS; it should remain usable with a neutral standalone stylesheet. Relative asset requests resolve under `public/lab/`. Keep playground assets relative; root-relative `/style.css` points to the website root, not the project. Regenerate and commit project assets when you change their sources.

Article and lab social previews use `social_image` when provided, with `cover_image` as fallback. Use a static JPEG or PNG for predictable social-card support, while retaining an animated cover on the actual page. Metadata stays in the initial HTML head for regular browsers and crawlers. `/sitemap.xml`, `/robots.txt`, and `/llms.txt` provide public discovery without requiring JavaScript. Search engines and LLM services still decide whether and when to index the pages.

Only configure repositories you trust. Playground HTML and JavaScript execute on the website's origin. This registry is an administrator-controlled code trust boundary, not a public upload feature.

## Understand freshness and dates

Project requests use Next.js `no-store` by default. A positive `NABOUS_CONTENT_CACHE_SECONDS` enables Next.js caching for that interval, up to one day. The browser-facing asset proxies send `Cache-Control: no-store`.

GitHub's raw-content infrastructure can still return cached content. A push is not a guarantee that every request immediately sees new bytes. No project files are fetched, cloned, or bundled during the website build or deployment. The website health check does not fetch project content.

Article dates come from GitHub's latest commit affecting `public/blog.md` at the configured ref, not the latest repository commit. Commit metadata has a separate one-minute in-memory cache and concurrent-request deduplication. Failed API requests back off for five minutes and preserve a previously known date. An unknown date displays as unavailable, never as the current time. This metadata cache does not cache the article body.

You can provide the server-only `NABOUS_GITHUB_TOKEN` to increase GitHub API limits. The raw-content loader supports public repositories only; the token is sent only to `api.github.com` for commit metadata. Never use `NEXT_PUBLIC_*` for these settings.

## Verify the runtime

After starting the server with your runtime environment, open `/health`, `/blog/`, `/blog/<slug>/`, and `/lab/<slug>/`. Check the lab's relative CSS and module requests in your browser's network panel. A missing project returns a 404; an upstream lab failure returns a 502. Article pages surface upstream errors rather than presenting them as a missing article. Indexes omit unavailable upstream articles so one repository does not hide the others.

GitHub Actions runs the unit tests and builds the production Docker image (including the Next.js build, lint and type checks). It transfers only the compressed runtime image over SSH. The server checks its SHA-256 checksum and commit label before replacing the running container; it never installs build dependencies or compiles the website. The uploaded archive is removed on success or failure.

The deployment script preserves `/var/www/html`, backs up the exact Nginx site file, changes only the inspected static fallback, checks Nginx syntax, and restores previous routing/runtime on failure. Other Nginx locations and included snippets remain unchanged. It retains the live website and one stopped rollback container, removes older unmounted website containers and unreferenced website image tags, and caps each new website container's local Docker logs at three 10 MB files. Configuration backups remain on the server. Application deployment does not prune other applications or their volumes.

## Verify analytics

The existing Nginx-injected Google tag initializes property `G-918ZJ86C13` and sends the first document page view. `src/components/PageViewTracker.tsx` sends an explicit `page_view` when Next.js commits a different path or query string, including navigation between the blog index and articles. It skips its first render and same-route renders to avoid duplicating the initial event. Hash-only section navigation is not another page view.

The tracker reuses the existing `gtag` function. It does not install a second tag, override consent settings, or bypass browser blockers. If you enable automatic history-based page views in GA enhanced measurement later, check for duplicates before combining them with this explicit route tracker.

In browser developer tools, filter network requests for `g/collect`. Check `tid=G-918ZJ86C13`, the `page_view` event, and the destination page location. An HTTP 204 confirms that Google's collection endpoint accepted the request, not that the event is already visible in a particular report. If Realtime remains empty, verify the selected GA property, active report/data filters, and your browser's tracking protection. Access to the GA dashboard is not required to verify the outgoing request and is not provided by this application.

### Glass effects

The site uses `@monabbous/lumenmorph` through its Tailwind plugin and React SVG components. Theme values live in `src/styles/globals.css`; one root client effect starts pointer tracking and cleans it up on unmount. Mobile tilt is disabled.

Standalone lab documents use the same package through `@apply` in `src/styles/lab-shell.css`. `pnpm build:lab-assets` compiles that stylesheet and copies the installed pointer module into ignored `public/generated/` assets. Both `pnpm dev` and `pnpm build` run this step automatically. After editing the lab stylesheet during a running development session, rerun `pnpm build:lab-assets`. The Docker build includes the generated assets through its existing public-directory copy.

Hosted labs receive raw page coordinates through `--mouse-x` / `--mouse-y`, CSS aliases of the package tracker’s `--lumen-x` / `--lumen-y`. Keep this compatibility contract for project-owned demos. The host does not import the motion stylesheet or animate the document coordinates; a demo can import its own motion styles and control smoothing on its own container. Host material defaults are scoped to host surfaces and branded Slidebox controls, rather than inherited from the document root.
