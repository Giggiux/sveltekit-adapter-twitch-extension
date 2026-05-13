# Twitch Deployment Guide

This guide explains how to prepare and deploy the Jitter Extension frontend to Twitch.

## 1. Configure SvelteKit Adapter

First, we need to modify the `svelte.config.js` to use the static adapter:

```javascript
import adapter from "@sveltejs/adapter-static";
// import adapter from '@sveltejs/adapter-cloudflare'; // Comment out or remove this line

import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    preprocess: vitePreprocess(),

    kit: {
        adapter: adapter({
            fallback: '200.html',
            relative: true,
        })
    }
};

export default config;
```

## 2. Set Production Environment Variables

Update your `.env` file with the production values:

```env
# Backend host URL for sending the click events
VITE_PARTYKIT_HOST=https://YOUR_CLOUDFLARE_WORKER_HOST

# Base Asset URL for static resources
VITE_ASSET_URL=https://YOUR_R2_PUBLIC_ASSET_BASE_URL
```

## 3. Build and Prepare Files

1. Build the application:
   ```bash
   pnpm build
   ```

2. Extract the inline script from `build/index.html`:
   - Open `build/index.html`
   - Find the `<script>` tag with the inline code
   - Copy the content between the script tags
   - Create a new file `build/script.js` and paste the content there

3. Modify `build/script.js`:
   - Find the line that defines the `element` variable
   - Change it to:
   ```javascript
   const element = document.getElementById('svelte-app');
   ```

4. Update `build/index.html`:
   - Find the parent element of the script tag
   - Add the ID `svelte-app` to it:
   ```html
   <body data-sveltekit-preload-data="hover">
	<div style="display: contents" id="svelte-app">
		<!-- here was the in-lined script -->
	</div>
   </body>
   ```
   - Change the script tag to reference the external file:
   ```html
   <script src="script.js"></script>
   ```

   - The full index should look something similar to:

   ```html
    <!doctype html>
    <html lang="en">

    <head>
        <meta charset="utf-8" />
        <link rel="icon" href="./favicon.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="https://extension-files.twitch.tv/helper/v1/twitch-ext.min.js"></script>


        <link rel="modulepreload" href="./_app/immutable/entry/start.COZZr_aF.js">
        <link rel="modulepreload" href="./_app/immutable/chunks/CR5u-d1G.js">
        <link rel="modulepreload" href="./_app/immutable/chunks/Lv4mEbVN.js">
        <link rel="modulepreload" href="./_app/immutable/chunks/wCpLZ_fb.js">
        <link rel="modulepreload" href="./_app/immutable/entry/app.CLuM1DkD.js">
        <link rel="modulepreload" href="./_app/immutable/chunks/DH7fwj-1.js">
        <link rel="modulepreload" href="./_app/immutable/chunks/BYEpk4B-.js">
        <link rel="modulepreload" href="./_app/immutable/chunks/Bg9kRutz.js">
        <link rel="modulepreload" href="./_app/immutable/chunks/CqKibgro.js">
    </head>

    <body data-sveltekit-preload-data="hover">
        <div style="display: contents" id="svelte-app">
            <script src="./script.js"></script>
        </div>
    </body>

    </html>
   ```

5. Remove the `static` folder from the `build` directory:
   ```bash
   rm -rf build/static
   ```

## 4. Create Deployment Package

1. Navigate to the `build` directory:
   ```bash
   cd build
   ```

2. Create a zip file containing all contents (not the folder itself):
   ```bash
   zip -r ../build.zip *
   ```

## 5. Upload to Twitch

1. Go to the Twitch Developer Console
2. Navigate to your extension
3. Go to the "Files" tab
4. Upload the `build.zip` file
5. Save the changes

## Important Notes

- Make sure all paths in your application are relative
- The application should work without any server-side functionality

## Troubleshooting

If you encounter any issues:

1. Check the browser console for errors
2. Verify all paths are correct and relative
3. Ensure the `svelte-app` ID is properly set
4. Confirm the script.js file is being loaded correctly
5. Verify the environment variables are properly set for production