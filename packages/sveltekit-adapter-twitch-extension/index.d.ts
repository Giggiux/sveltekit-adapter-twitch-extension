import { Adapter } from '@sveltejs/kit';

export interface AdapterOptions {
	pages?: string;
	assets?: string;
	fallback?: string;
	precompress?: boolean;
	strict?: boolean;
	/** When true, runs `zip -r` to create `build.zip` next to the output directory (requires a `zip` CLI). */
	createZip?: boolean;
	/**
	 * When `true` (default), deletes the `static` directory inside the build output if present
	 * (matches the Twitch deployment guide). Set to `false` to keep it.
	 */
	removeStatic?: boolean;
}

export default function plugin(options?: AdapterOptions): Adapter;
