# x-read private reader

A reading collection that opens original articles with inline AI-generated notes. The reader requires GitHub sign-in and permits only
the configured owner's numeric GitHub account ID. A GitHub App user access token
reads this repository on the owner's behalf. Tokens never reach the browser.

## Architecture

One Node process serves the login page, authenticated frontend, session endpoints,
and private repository API. Traefik continues to terminate HTTPS. The container
publishes no host ports and joins the configured external proxy network.

The browser calls `/api/library` on the same origin. The backend discovers the
latest commit, lists journal Markdown entries, and downloads them with the
GitHub Contents API. New entries require no site rebuild or deployment.

The server extracts only annotations and short anchors from existing journal entries.
The library API sends notes and metadata to the browser.

Library snapshots are cached **in server memory, per signed-in session**, for
five minutes by default. Fresh caches avoid GitHub requests; expired caches check
the latest commit and reuse articles when unchanged. Failed refreshes retain the
last complete snapshot with its original check time. Rate-limit headers and a
minimum one-minute error cooldown prevent repeated retries. Set
`CACHE_TTL_SECONDS` (0–3600) in the deployment environment to adjust this window.

Articles and tokens are not persisted in browser storage. The frontend removes
legacy public-reader article caches on startup. It keeps the loaded collection
in memory, and only the color preference persists locally. Authenticated
responses use `Cache-Control: no-store`.

## Register a GitHub App

Create an app under your GitHub account's **Settings → Developer settings →
GitHub Apps → New GitHub App**. This is a GitHub App, not a traditional OAuth App.
Use your actual HTTPS origin in place of `https://read.example.com` below:

| Setting | Value |
| --- | --- |
| Homepage URL | `https://read.example.com` |
| User authorization callback URL | `https://read.example.com/auth/callback` |
| Expire user authorization tokens | Enabled |
| Request user authorization during installation | Disabled; sign in through the site instead. |
| Device flow | Disabled |
| Webhook | Inactive; this deployment does not expose a webhook endpoint. |
| Repository permissions → Contents | Read-only |
| Repository permissions → Metadata | Read-only (automatically required by GitHub). |
| Account permissions | None |
| Where can this GitHub App be installed? | Only on this account. |

Save the app, generate a **client secret**, and note the **Client ID** (not the
App ID). A private key is not needed for this user-authorization flow. Install
the app on **only the reading repository** using the app's Install App page.

The allowed user is identified by numeric ID, so another account cannot gain
access by acquiring a previous username. Find your ID in the `id` field of
`https://api.github.com/users/YOUR_USERNAME`. This is public account metadata,
not a credential. Set that number as `GITHUB_ALLOWED_USER_ID`.

## Deploy

From the repository root:

```sh
cp .env.example .env
mkdir -p secrets
chmod 700 secrets
```

Edit `.env` with the hostname, existing Traefik network, Client ID, and allowed
user ID. Store the client secret as the sole contents of
`secrets/github-client-secret` using a text editor, and restrict the file:

```sh
chmod 600 secrets/github-client-secret
```

Both `.env` and `secrets/` are Git-ignored and excluded from the Docker context.
Compose mounts the secret read-only at `/run/secrets/github_client_secret`.
The runtime runs as the image's `node` user (UID 1000); ensure that user can read
the mounted file. On a typical Linux host where your deployment user is UID
1000, a file owned by that user with mode 600 works. Do not make it world-readable.

| Variable | Purpose |
| --- | --- |
| `SITE_DOMAIN` | Public hostname without a scheme or path. |
| `TRAEFIK_NETWORK` | Existing external Docker network shared with Traefik. |
| `TRAEFIK_ENTRYPOINT` | HTTPS entrypoint; default `websecure`. |
| `TRAEFIK_CERT_RESOLVER` | Certificate resolver; default `letsencrypt`. |
| `GITHUB_CLIENT_ID` | GitHub App Client ID. |
| `GITHUB_ALLOWED_USER_ID` | Numeric ID of the sole permitted GitHub user. |
| `GITHUB_CLIENT_SECRET_FILE_HOST` | Secret file path; default example `./secrets/github-client-secret`. |
| `CACHE_TTL_SECONDS` | Server cache TTL; default 300 seconds. |

Traefik must watch Docker labels, provide the configured HTTPS entrypoint and
certificate resolver, and share the external network. DNS must point to the
host. Compose forwards requests to the authenticated Node service on container
port 3000; there is no Nginx or separate public static-content route.

```sh
docker compose config --quiet
docker compose up -d --build
docker compose ps
docker compose logs --tail=50 reader
```

Use `sudo` if your host requires it. Visit the configured hostname, choose
**Sign in with GitHub**, and authorize the app. Check that an incognito window
shows only the login page and cannot access `/api/library` or frontend assets.
For future updates, run `git pull --ff-only` then `docker compose up -d --build`.
A container restart discards sessions and cached articles; sign in again.

## Local development and tests

Requires Node 24. Install dependencies with `cd site && npm ci`. Configure a
separate development GitHub App with homepage `http://127.0.0.1:3000` and callback
`http://127.0.0.1:3000/auth/callback`. Use a root `.env` containing:

```dotenv
PUBLIC_URL=http://127.0.0.1:3000
HOST=127.0.0.1
GITHUB_CLIENT_ID=YOUR_DEVELOPMENT_CLIENT_ID
GITHUB_ALLOWED_USER_ID=YOUR_NUMERIC_ID
GITHUB_CLIENT_SECRET_FILE=../secrets/github-client-secret
```

From `site/`, `npm run dev` builds the frontend and starts the real authenticated
backend in development mode. There is no authentication bypass. HTTP cookies
are permitted only for loopback development; production requires HTTPS. This
preview uses a production frontend build, so rerun it after frontend changes.
`npm run build` creates `site/dist/`; **do not host that directory through an
unprotected static web server**.

`npm test` runs repository rendering, source-link sanitization, cache behavior,
and authentication tests. Integration tests start a temporary loopback server
with mocked GitHub responses; they need no real credentials or network access
to GitHub. They cover state/PKCE, unauthorized accounts, protected pages/assets,
private API fetching, caching, token refresh, CSRF logout, and revoked access.

## Session and privacy boundaries

Sessions use random opaque cookies with HttpOnly, SameSite=Lax, and Secure in
production. OAuth state is browser-bound, single-use, and expires after ten
minutes; PKCE binds the token exchange to its initiating flow. Access and refresh
tokens remain in server memory. Expiring tokens rotate automatically. Website
sessions last up to 24 hours, with a new login required after restart or expiry.

Sign out uses a same-origin POST with a session CSRF token, removes the server
session, and sends `Clear-Site-Data` for cache/storage. Other open reader tabs
clear their content when notified; visible pages also verify the local server
session every minute and on focus. This session check does not call GitHub.
Previously downloaded or manually copied material cannot be recalled.

This deployment does not consume GitHub revocation webhooks. Revocation is
detected on the next GitHub request (normally the first collection request after
cache expiry), at which point the session is invalidated and cached data is not
returned. An already displayed article remains visible until a local session
check or navigation detects the invalidation. To end all website sessions
immediately, restart the reader service.

## Code boundaries

- `server/auth.js`: configuration, OAuth state/PKCE, sessions, and token rotation.
- `server/server.js`: route authentication, logout, authenticated GitHub adapter,
  security headers, and static file serving.
- `src/cache.js`: snapshot freshness, retry cooldowns, and complete-cache retention;
  production uses this module on the server with memory storage.
- `src/content.js`: journal parsing, selection, and commit-consistent loading.
- `src/app.js`: session-aware library controls and theme.
- `src/render.js`: entry metadata, original-source links, and reading actions.

Google Fonts are optional and have system-font fallbacks. The collection is read from the
repository configured in `src/content.js`.

References: [GitHub App user authorization](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app),
[token rotation](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/refreshing-user-access-tokens),
and [repository Contents API](https://docs.github.com/en/rest/repos/contents).

## Repeatable browser verification

Use Node.js 24. No GitHub App credentials, private repository access, or running
production server are needed:

```sh
cd site
npm ci
npx playwright install chromium webkit
npm run verify
```

`verify` runs the unit/security checks, builds the production frontend, and runs
Playwright against the actual reader HTTP server with a fresh server and browser
context for every test. Only GitHub's external OAuth/API boundary is simulated;
the real state, cookies, callback, owner check, session, server cache, frontend,
and logout routes execute. The fixture is under `e2e/`, excluded from the Docker
image, and adds no authentication bypass to the application. Browser requests to
external services are blocked; unexpected external requests fail the test.

Following the emphasis on executable checks and runtime verification in
[Lauren Tan's talk](https://ai.engineer/talks/O_zcc6Xl12g-all-code-is-slop-except-mine),
these tests describe user-visible behavior and privacy requirements rather than
pinning internal function calls. This is browser verification, not a formal proof.

| User flow / requirement | Executable coverage |
| --- | --- |
| Private reader | Signed-out API/asset denial; unapproved account denied; revoked access invalidates session |
| Browse and read | Topic counts/headings, search and empty results, title sorting, source links and note-only extension handoff |
| Cache and rate limits | Reload makes no upstream calls within TTL; rate limit retains cached articles; retry respects cooldown; articles absent from localStorage |
| Sign out | Both tabs return to sign-in; API denied; back navigation does not restore article |
| Desktop layout | Separate content panel; sidebar remains in viewport at collection bottom; no page overflow |
| Mobile layout | Brand/theme share a row with theme on right; sign-out beside theme on both layouts; no page overflow; theme persists after reload |

Every flow runs in desktop Chromium (1440 × 900), Pixel 5 Chromium emulation,
and iPhone 13 WebKit emulation. Emulation does not replace testing on physical
phones or the final HTTPS deployment. Real GitHub permissions, credentials, token
exchange, and proxy routing still need a separate live integration check.

For browser checks alone, run `npm run test:e2e`. To select one device, run
`npm run test:e2e -- --project=mobile`. Use `npm run test:e2e:report` to open the
HTML report. The report includes collection, inline-note, sign-in, and dark-theme
screenshots. Raw screenshots and failure traces are stored in
`playwright-artifacts/e2e/results/`, and the HTML report is in
`playwright-artifacts/e2e/report/`.
Screenshots are review evidence, not automatically accepted visual baselines;
layout properties are asserted directly. Zero automatic retries keep failures
visible. GitHub Actions runs the same verification and uploads reports for seven
days. No application secrets are required in CI.

Playwright is pinned to 1.56.1 so its bundled WebKit runs on macOS 14 as well as
CI Linux. Upgrade the runner and browser binaries together, then verify all three
projects; newer Playwright releases can require a newer macOS version.

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

Notes-only entries can use Markdown headings (level two or below) matching the
publisher's headings. The text below each heading becomes one callout. This
prototype shows notes as plain text on the publisher's page.

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

Run `npm run test:walkthrough` from `site/` to record the desktop walkthrough.
The WebM is in `playwright-artifacts/walkthrough/results/`. Run
`npm run test:walkthrough:report` to open the HTML report in
`playwright-artifacts/walkthrough/report/`.
