# NASFLIX starter website

A responsive static front-end prototype for a creator-owned entertainment catalogue.

## Included
- Responsive homepage and navigation
- Browse filters for Movies, AI Videos, Series and Music
- Search
- Preview player UI
- Admin catalogue form for adding/removing demo entries in the current browser session

## Important limitations
This is a **front-end starter**, not a production streaming backend:
- The Admin panel is not authenticated. Do not publish private credentials or treat it as a secure admin area.
- Added entries exist only in the current page session and are not saved to a server/database.
- Media URLs are optional previews. No files are uploaded to cloud storage yet.
- Download controls appear only for entries with a supplied URL and the download option enabled.
- Use only media you own or are licensed to distribute.

## Deploy on GitHub Pages
1. Create a new **public** GitHub repository named `nasflix`.
2. Upload `index.html`, `styles.css`, `app.js`, and this README to the repository root.
3. In GitHub, open **Settings → Pages**.
4. Under Build and deployment, select **Deploy from a branch**.
5. Select branch `main` and folder `/ (root)`, then Save.
6. GitHub will show the published URL after deployment.

You can also connect the repository to Cloudflare Pages:
1. Sign in to Cloudflare and open **Workers & Pages → Create → Pages → Connect to Git**.
2. Select the `nasflix` repository.
3. Framework preset: **None**. Build command: leave blank. Build output directory: `/`.
4. Deploy. Cloudflare will provide a `*.pages.dev` address if the project name is available.

## Next production steps
1. Add a real admin authentication system.
2. Add a server-side upload API with file validation and size limits.
3. Store media in object storage (for example Cloudflare R2) and metadata in a database.
4. Generate signed or access-controlled upload/download URLs where appropriate.
5. Add moderation, copyright/takedown contact, privacy policy and terms before public launch.
