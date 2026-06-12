import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'node-html-parser';

/**
 * Twitch Extensions post-process for SvelteKit static builds.
 *
 * Relies on SvelteKit emitting `const element = document.currentScript.parentElement;`
 * in the inline bootstrap (see @sveltejs/kit `src/runtime/server/page/render.js`). If
 * that line changes across @sveltejs/kit upgrades, update the regexes in this file and
 * re-run `pnpm build` to verify prerendered HTML shells and script.js.
 */
const MOUNT_LINE_RE = /const\s+element\s*=\s*document\.currentScript\.parentElement;/;
const MOUNT_LINE_MIN = /const element=document\.currentScript\.parentElement;/;
const MOUNT_FIXED = "const element = document.getElementById('svelte-app');";
const MOUNT_FIXED_MIN = 'const element=document.getElementById(\'svelte-app\');';

/**
 * @param {string} htmlPath
 * @returns {{ js: string, doc: import('node-html-parser').HTMLElement, bootstrap: import('node-html-parser').HTMLElement }}
 */
function parseAndExtract(htmlPath) {
	const raw = fs.readFileSync(htmlPath, 'utf8');
	const doc = /** @type {import('node-html-parser').HTMLElement} */ (parse(raw, { comment: true }));
	const scripts = doc.querySelectorAll('script');
	/** @type {import('node-html-parser').HTMLElement | undefined} */
	let bootstrap;
	for (const s of scripts) {
		if (s.getAttribute('src')) continue;
		const inner = s.innerHTML;
		if (inner.includes('document.currentScript.parentElement')) {
			bootstrap = s;
			break;
		}
	}
	if (!bootstrap) {
		throw new Error(
			`sveltekit-adapter-twitch-extension: Missing SvelteKit inline bootstrap (document.currentScript.parentElement) in ${htmlPath}`
		);
	}
	let js = bootstrap.innerHTML;
	js = js.replace(MOUNT_LINE_RE, MOUNT_FIXED).replace(MOUNT_LINE_MIN, MOUNT_FIXED_MIN);
	return { js, doc, bootstrap };
}

/**
 * After adapter-static writes prerendered pages and optional SPA fallback, reshape the
 * build for Twitch Extensions CSP: externalize the inline bootstrap script and mount
 * via #svelte-app (document.currentScript is wrong for external scripts).
 *
 * @param {{ pages: string; log: { minor: (s: string) => void; warn: (s: string) => void; (s: string): void }; createZip?: boolean; removeStatic?: boolean }} opts
 */
/**
 * @param {string} pages
 * @returns {string[]}
 */
function listHtmlShells(pages) {
	return fs
		.readdirSync(pages, { withFileTypes: true })
		.filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
		.map((entry) => entry.name)
		.sort((a, b) => {
			if (a === 'index.html') return -1;
			if (b === 'index.html') return 1;
			return a.localeCompare(b);
		});
}

export function postProcessTwitchExtensionBuild(opts) {
	const { pages, log, createZip = false, removeStatic = true } = opts;
	/** @type {{ path: string; js: string; doc: import('node-html-parser').HTMLElement; bootstrap: import('node-html-parser').HTMLElement }[]} */
	const parsed = [];

	for (const name of listHtmlShells(pages)) {
		const htmlPath = path.join(pages, name);
		try {
			parsed.push({ path: htmlPath, ...parseAndExtract(htmlPath) });
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			log.warn(`sveltekit-adapter-twitch-extension: skipped ${name} (${msg})`);
		}
	}

	if (parsed.length === 0) {
		log.warn('sveltekit-adapter-twitch-extension: No prerendered HTML shells found to post-process');
		return;
	}

	/** @type {Map<string, string>} transformed script source -> filename */
	const contentToFile = new Map();
	let dedupeIdx = 0;
	for (const item of parsed) {
		if (contentToFile.has(item.js)) continue;
		const fname = dedupeIdx === 0 ? 'script.js' : `script-${dedupeIdx}.js`;
		contentToFile.set(item.js, fname);
		fs.writeFileSync(path.join(pages, fname), item.js, 'utf8');
		log.minor(`sveltekit-adapter-twitch-extension: wrote ${fname}`);
		dedupeIdx++;
	}

	for (const item of parsed) {
		const fname = /** @type {string} */ (contentToFile.get(item.js));
		const rel = `./${fname}`;
		const parent = item.bootstrap.parentNode;
		if (parent && 'setAttribute' in parent) {
			/** @type {import('node-html-parser').HTMLElement} */ (parent).setAttribute('id', 'svelte-app');
		}
		const frag = parse(`<script src="${rel}"></script>`, { comment: true });
		const replacement = frag.querySelector('script');
		if (!replacement) throw new Error('sveltekit-adapter-twitch-extension: failed to parse replacement script tag');
		item.bootstrap.replaceWith(replacement);
		fs.writeFileSync(item.path, item.doc.toString(), 'utf8');
		log.minor(`sveltekit-adapter-twitch-extension: updated ${path.basename(item.path)}`);
	}

	if (removeStatic) {
		const staticDir = path.join(pages, 'static');
		if (fs.existsSync(staticDir)) {
			fs.rmSync(staticDir, { recursive: true, force: true });
			log.minor('sveltekit-adapter-twitch-extension: removed build/static');
		}
	}

	if (createZip) {
		const zipPath = path.join(path.dirname(pages), 'build.zip');
		try {
			fs.rmSync(zipPath, { force: true });
			execFileSync('zip', ['-q', '-r', zipPath, '.'], { cwd: pages, stdio: 'pipe' });
			log(`sveltekit-adapter-twitch-extension: wrote ${zipPath}`);
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			log.warn(
				`sveltekit-adapter-twitch-extension: createZip failed (${msg}). Install a zip CLI or set createZip: false.`
			);
		}
	}
}
