# sveltekit-adapter-twitch-extension

Static adapter for [SvelteKit](https://svelte.dev/docs/kit) based on [`@sveltejs/adapter-static`](https://svelte.dev/docs/kit/adapter-static), with a **post-build pass** aimed at [Twitch Extensions](https://dev.twitch.tv/docs/extensions/) asset hosting and CSP.

> [!WARNING]
> **Work in progress.** This package is under active development, has not been thoroughly tested yet, and its API and behavior may change without a major-version bump. Use at your own risk in production.

Repository: [github.com/giggiux/sveltekit-adapter-twitch-extension](https://github.com/giggiux/sveltekit-adapter-twitch-extension)

## Why this exists (Twitch CSP)

Twitch loads your extension HTML inside a sandboxed frame with a strict [Content Security Policy](https://dev.twitch.tv/docs/extensions/#security-model). In particular, `script-src` allows scripts from `'self'`, your extension origin, `https://extension-files.twitch.tv` (the Extension Helper), and Google Analytics — **not** `'unsafe-inline'`.

SvelteKit’s default prerendered HTML includes an **inline** bootstrap `<script>` that calls `start()` with a mount target derived from `document.currentScript.parentElement`. That pattern is incompatible with Twitch’s policy once you move the script to an external file (because `currentScript` is no longer the inline tag SvelteKit expects).

This adapter automates the manual steps described in [docs/twitch-deployment-guide.md](docs/twitch-deployment-guide.md).

## What the adapter does for Twitch compliance

After the normal `adapter-static` output is written (`writeClient`, `writePrerendered`, optional `generateFallback`), the adapter runs a **Twitch post-process** on the HTML shell(s):

1. **Targets** `index.html` (prerendered home) and, if present, `200.html` (SPA fallback from the `fallback` option).

2. **Finds the SvelteKit bootstrap** — the first **inline** `<script>` (no `src`) whose body contains `document.currentScript.parentElement` (the mount line SvelteKit emits in [`render.js`](https://github.com/sveltejs/kit/blob/main/packages/kit/src/runtime/server/page/render.js)).

3. **Rewrites the mount target** inside that script’s source before writing it to disk:
   - from: `const element = document.currentScript.parentElement;` (or the minified equivalent)
   - to: `const element = document.getElementById('svelte-app');`
   so hydration still works when the script is loaded via `src` (external scripts are not `document.currentScript` in the same way).

4. **Writes external script file(s)** next to the HTML:
   - `script.js` for the first unique bootstrap body;
   - `script-1.js`, `script-2.js`, … if `index.html` and `200.html` differ (deduped when identical).

5. **Updates each processed HTML file**:
   - sets `id="svelte-app"` on the parent element of the old inline script (the usual `div[style="display: contents"]` wrapper);
   - replaces the inline bootstrap with `<script src="./script.js"></script>` (or the matching deduped filename).

6. **Optional `removeStatic: true` (default)** — deletes `<pages>/static` under the build output **if it exists** (matches common Twitch zip layouts; turn off if you rely on that folder).

7. **Optional `createZip: true`** — runs the system `zip` CLI to create `build.zip` beside the output directory (requires `zip` installed on the machine running the build).

**Still your responsibility in the app** (not done by the adapter):

- Set **`kit.paths.relative: true`** in `svelte.config.js` so asset URLs work when the extension is not served from the domain root (see [SvelteKit `paths`](https://svelte.dev/docs/kit/configuration#paths)).
- Use **`export const prerender = true`** (typically on the root layout) so pages are static enough for `adapter-static`, unless you intentionally use `fallback` for SPA-only routes.
- Add the [Twitch Extension Helper](https://extension-files.twitch.tv/helper/v1/twitch-ext.min.js) in `src/app.html` if you use the Twitch JS API.
- Respect Twitch **connect-src** / **img-src** allowlists in the developer console for any APIs or CDNs you call.

## Install

```sh
pnpm add -D sveltekit-adapter-twitch-extension
```

Peer dependency: `@sveltejs/kit` v2 (already part of SvelteKit apps).

## Usage

```js
// svelte.config.js
import adapter from 'sveltekit-adapter-twitch-extension';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		paths: {
			relative: true
		},
		adapter: adapter({
			fallback: '200.html',
			removeStatic: true,
			createZip: false
		})
	}
};

export default config;
```

```js
// e.g. src/routes/+layout.ts — prerender the whole app for full static output
export const prerender = true;
```

## Adapter options (full reference)

This package accepts the same options as [`@sveltejs/adapter-static`](https://svelte.dev/docs/kit/adapter-static#options), plus Twitch-specific flags.

### Inherited from `@sveltejs/adapter-static`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `pages` | `string` | `'build'` | Directory for prerendered HTML and processed shells (`index.html`, `200.html`, …). |
| `assets` | `string` | same as `pages` | Client assets (`_app`, copied `static/` files, etc.). Usually equals `pages`; split only if your host needs separate trees. |
| `fallback` | `string` | `undefined` | SPA shell filename written under `pages`, e.g. `'200.html'`. Recommended for Twitch if you use client-side routing beyond prerendered paths. See [SvelteKit SPA / fallback](https://svelte.dev/docs/kit/single-page-apps#usage). |
| `precompress` | `boolean` | `false` | Emit `.br` / `.gz` alongside assets. Runs **after** the Twitch HTML pass so `script.js` is included if enabled. |
| `strict` | `boolean` | `true` | If `true`, fail the build when any route cannot be prerendered and no `fallback` is set. See [strict](https://svelte.dev/docs/kit/adapter-static#strict). |

Official reference: [Static site generation / adapter-static](https://svelte.dev/docs/kit/adapter-static).

### Twitch-specific

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `createZip` | `boolean` | `false` | When `true`, creates `build.zip` in the parent directory of `pages` (e.g. next to `build/` when `pages` is `'build'`), containing the contents of the output folder. Requires a `zip` binary on `PATH`. |
| `removeStatic` | `boolean` | `true` | When `true`, removes the `static` subdirectory inside the output folder if present (some deployment guides drop it before zipping for Twitch). |

TypeScript types: [`packages/sveltekit-adapter-twitch-extension/index.d.ts`](packages/sveltekit-adapter-twitch-extension/index.d.ts).

## Publishing

From the repository root (this monorepo):

```sh
pnpm publish --filter sveltekit-adapter-twitch-extension
```

Unscoped packages are **public** on npm by default (log in with the owning npm account).

### Publish from GitHub Actions (push to `master`)

The workflow [.github/workflows/publish.yml](.github/workflows/publish.yml) runs on **pushes to `master`** when the adapter package or root lockfile changes. It publishes **only if** the adapter `version` in [`packages/sveltekit-adapter-twitch-extension/package.json`](packages/sveltekit-adapter-twitch-extension/package.json) is **not** already on npm.

1. Create an npm **access token** (granular publish token or classic **Automation** token).
2. GitHub repo → **Settings → Secrets and variables → Actions** → secret **`NPM_TOKEN`**.
3. Bump `version`, merge to `master`.

`actions/setup-node` uses `registry-url: https://registry.npmjs.org`; `NODE_AUTH_TOKEN` is set from `NPM_TOKEN` for `pnpm publish`.

If your default branch is **`main`**, add `main` to `branches:` in `publish.yml`.

## Development

This repo is a pnpm workspace:

- `packages/sveltekit-adapter-twitch-extension` — published adapter
- `examples/demo-app` — minimal SvelteKit app used to validate the adapter

```sh
pnpm install
pnpm run build:example
pnpm run check:example
```

See [docs/twitch-deployment-guide.md](docs/twitch-deployment-guide.md) for the original manual checklist (most HTML steps are automated here).

## License

MIT — see [LICENSE](LICENSE).
