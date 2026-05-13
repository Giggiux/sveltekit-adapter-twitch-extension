# sveltekit-adapter-twitch-extension

SvelteKit static adapter for **Twitch Extensions**: post-build pass externalizes the inline bootstrap, sets `#svelte-app`, and aligns with Twitch’s extension CSP.

> [!WARNING]
> **Work in progress.** This package is under active development, has not been thoroughly tested yet, and its API and behavior may change without a major-version bump. Use at your own risk in production.

**[Documentation, Twitch compliance steps & full options table](https://github.com/giggiux/sveltekit-adapter-twitch-extension#readme)**

## Quick start

```sh
pnpm add -D sveltekit-adapter-twitch-extension
```

```js
// svelte.config.js
import adapter from 'sveltekit-adapter-twitch-extension';

/** @type {import('@sveltejs/kit').Config} */
export default {
	kit: {
		paths: { relative: true },
		adapter: adapter({
			fallback: '200.html',
			removeStatic: true,
			createZip: false
		})
	}
};
```

Options: all [`@sveltejs/adapter-static`](https://svelte.dev/docs/kit/adapter-static#options) options, plus `createZip` and `removeStatic`. See the monorepo README on GitHub.

## Attribution

This package started from **[`@sveltejs/adapter-static`](https://github.com/sveltejs/kit/tree/main/packages/adapter-static)** in the [SvelteKit](https://github.com/sveltejs/kit) monorepo. The following files are still **directly derived** from that upstream package (with edits for the Twitch post-build and renamed package metadata):

- `index.js` — core `adapt()` flow (prerender, fallback, compression) plus a post-pass hook
- `platforms.js` — zero-config platform detection copied from upstream
- `index.d.ts` / `internal.d.ts` — types aligned with SvelteKit’s adapter builder surface

**`twitch-postprocess.js`** is **not** from Svelte; it implements the Twitch-oriented HTML/script transform and was written for this fork. Its behavior is informed by SvelteKit’s server render pipeline (notably how the client bootstrap references `document.currentScript.parentElement` in [`packages/kit/src/runtime/server/page/render.js`](https://github.com/sveltejs/kit/blob/main/packages/kit/src/runtime/server/page/render.js)).

Upstream adapter-static remains **MIT** licensed; this derivative includes the same license terms and retains copyright notices for Svelte contributors where applicable. See the bundled `LICENSE` file.

## License

MIT
