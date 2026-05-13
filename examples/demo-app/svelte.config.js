import adapter from 'sveltekit-adapter-twitch-extension';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		paths: {
			relative: true
		},
		adapter: adapter({
			fallback: '200.html'
		})
	}
};

export default config;
