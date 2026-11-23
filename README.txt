THE DIRT — FIXED NEWS FEEDS

Why old version failed: Safari blocks cross-origin RSS fetching, and public RSS proxies are unreliable.
This version adds Netlify Functions to fetch RSS on the server and improve article image loading.

IMPORTANT: This version MUST be deployed through a Git-connected Netlify project, or the Netlify CLI.
Netlify Drop/drag-and-drop of a static ZIP is NOT sufficient for the server functions.

Easy publish route:
1. On GitHub, create a new PRIVATE repository, e.g. the-dirt.
2. Upload index.html, netlify.toml, and the netlify/functions folder contents to the repository.
   (On a computer, unzip the folder and push all files, preserving folder structure.)
3. In Netlify, choose Add new project > Import an existing project > GitHub.
4. Select your new repository. Netlify should detect the netlify.toml config.
5. Deploy. Open the new Netlify URL.
6. In Safari, Share > Add to Home Screen.

The original Netlify Drop URL will not automatically update. You may need to replace the Home Screen shortcut.
Read history and saved stories live in your browser's localStorage, so changing site domains can reset them.
Publisher feeds sometimes change or block automated access; not every source or photo is guaranteed.
Custom RSS sites are bookmarkable, but new sources need to be added to the allowlist in netlify/functions/feed.mjs to fetch through the server.
