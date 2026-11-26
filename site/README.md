# x-read reader

x-read is a public reading journal. Anyone can browse, search, filter, and sort
the notes library. **Read with notes** opens the original publisher page, where
the Chrome extension can display individual notes inline.

## How the library loads

The Node server serves the landing page and `GET /api/library`. It checks the
default branch of `danjia21/x-read` through the public GitHub REST API. When the
commit changes, it lists the Git tree and fetches journal Markdown from
`raw.githubusercontent.com` at that commit. The API returns metadata and
structured notes from `notes-v1` entries. New entries appear after the next
successful refresh without a site rebuild.

A single server-side cache shares refreshes across visitors and coalesces
concurrent requests. GitHub's unauthenticated REST limit is 60 requests per hour
per originating IP. With the default five-minute cache, a busy reader process
makes about 12 REST calls per hour when the commit is stable, with one extra tree
request per changed commit. Per-entry downloads use the raw file host. Server
restarts and additional replicas sharing the same egress IP increase upstream
traffic. [GitHub REST rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)

If a refresh fails, visitors can continue reading the last complete snapshot.
On a cold start, a partial download can show available notes. A complete failure
shows a retry action. Retries respect a server-side cooldown of at least one
minute and any longer GitHub rate-limit deadline. The browser stores the theme
preference locally.

## Run locally

Use Node.js 24.

```sh
cd site
npm ci
npm run dev
```

Open `http://127.0.0.1:3000`. The server accepts optional `HOST`, `PORT`, and
`CACHE_TTL_SECONDS` settings through the environment or the root `.env` file when
using `npm run dev`. The default cache lifetime is 300 seconds.

## Deploy with Docker Compose and Traefik

Copy `.env.example` to `.env` in the repository root and set `SITE_DOMAIN` and
`TRAEFIK_NETWORK` for your Traefik setup. Set `TRAEFIK_ENTRYPOINT` and
`TRAEFIK_CERT_RESOLVER` if your installation uses different names. Point the
domain at Traefik, then run from the repository root:

```sh
docker compose up -d --build
```

Traefik terminates TLS and forwards requests to the reader on container port
3000. `GET /healthz` checks that the process is responding. Open the deployed
domain in a fresh browser window to check that the library loads.

## Verify with fixtures

```sh
cd site
npm ci
npx playwright install chromium webkit
npm run verify
npm run test:walkthrough
```

`verify` validates the notes-only entries, runs the Node tests, builds the
frontend, and exercises the production HTTP server in desktop Chromium, Pixel 5
Chromium emulation, and iPhone 13 WebKit emulation. Tests inject fixture GitHub
responses, including a cold upstream failure, recovery, and rate limits with a
warm cache. Browser tests cover public loading, search, filtering, sorting, theme
persistence, and the notes-only handoff. The overlay tests use synthetic publisher
pages. Open the browser report with `npm run test:e2e:report`.

The desktop walkthrough shows a GitHub failure and recovery, then browsing and
opening a fixture publisher page with inline notes. It captures the site's
handoff and runs the real overlay in the recorded tab to keep the sequence in one
video. The WebM is under `playwright-artifacts/walkthrough/results/`. Open the
report with `npm run test:walkthrough:report`.

## Read on the publisher page with Chrome notes

1. Open `chrome://extensions` in desktop Chrome, enable **Developer mode**, and
   choose **Load unpacked**. Select the `site/chrome-extension` folder.
2. Pin **x-read Notes** from Chrome's Extensions menu. Refresh the local x-read
   page after installing or reloading the extension.
3. Click **Read with notes** beneath an entry on the library page.
   On the publisher tab, click the pinned **x-read Notes** icon.

The extension temporarily receives only the selected entry's note text and
anchors. It requests access to the opened article tab through the toolbar
click. Notes go under a unique matching passage or heading, and ambiguous or
missing anchors go under **Unplaced notes**. Reloading the publisher page resets
its displayed notes. Click the icon again to restore them. An article redirected
to a different URL may require updating its source link.

Notes can use heading and passage anchors to match locations on the publisher’s
page. The overlay displays the notes as plain text.

The extension bridge is configured for the loopback reader on ports 3000 and
4173. To connect a hosted reader, add its exact origin to `bridge.js` and its
content-script match pattern to `manifest.json`, then reload the extension.

### Automated note screenshots

Run `npm run test:visual` from `site/` to generate light and dark screenshots
of the extension callouts on desktop Chromium, Pixel 5, and iPhone 13 layouts.
The test uses a local fixture with English and Chinese notes and checks text
width, spacing, and overflow. It runs the actual overlay script directly, so
there is no extension installation or publisher navigation for this test.
Open the images in `playwright-artifacts/e2e/results/` or run `npm run test:e2e:report` to view
the report. The regular `npm run verify` suite also runs this check.
