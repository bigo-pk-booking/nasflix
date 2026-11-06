# NASFLIX

A responsive entertainment catalogue for creator-owned movies, AI videos, series and music.

## Current features
- Responsive homepage, category filters and search
- Preview player for video/audio URLs and uploaded media
- Admin upload form with access-key protection
- Cloudflare Pages Functions API
- Cloudflare R2 object storage for uploaded media
- Cloudflare D1 catalogue metadata
- Delete saved catalogue items from Admin

## Cloudflare Pages setup

The site is deployed as a Cloudflare Pages project connected to the GitHub repository.

Build settings:
- Framework preset: None
- Build command: leave blank
- Build output directory: `/`
- Production branch: `main`

## Required Cloudflare resources

The upload API will return a storage-not-configured error until these bindings and the D1 schema are installed.

### 1. Create an R2 bucket
In Cloudflare Dashboard, open **R2 Object Storage** and create a bucket named `nasflix-media`.

In the Pages project, open **Settings → Functions → R2 bucket bindings** and add:
- Variable name: `MEDIA_BUCKET`
- R2 bucket: `nasflix-media`

### 2. Create a D1 database
In Cloudflare Dashboard, open **Workers & Pages → D1 SQL Database** and create a database named `nasflix-db`.

Open the database Console and run the complete SQL from this repository's `schema.sql` file.

In the Pages project, open **Settings → Functions → D1 database bindings** and add:
- Variable name: `DB`
- D1 database: `nasflix-db`

### 3. Add the admin secret
In the Pages project, open **Settings → Environment variables** (or **Settings → Variables and Secrets**) and add a production secret:
- Name: `ADMIN_TOKEN`
- Value: create a long, random private key and keep it secret

Do not put the key in GitHub, source code, screenshots or public messages. Enter it only in the Admin Studio access-key field when uploading or deleting saved media.

After adding bindings/secrets, trigger a new deployment so Pages Functions receive the resources.

## Upload limits and notes
- This starter uploader accepts files up to **50 MB**.
- Supported types: MP4, WebM, MP3, M4A, OGG, WAV, JPG, PNG and WebP.
- Full-length movies are often larger than this limit. A later upgrade should use direct-to-R2 multipart or signed uploads for large files.
- Uploaded media is served through the Pages Function at `/media/...`.
- Download permission is controlled by the Admin checkbox. Only enable it for files you own or are licensed to distribute.
- Demo catalogue entries remain illustrative previews; uploaded entries are stored in D1 and R2.

## Security and launch checklist
- Use a long random `ADMIN_TOKEN` and rotate it if exposed.
- Do not share the admin key.
- Add a proper multi-user login before inviting other admins.
- Add privacy policy, terms, copyright/takedown contact and moderation procedures before public launch.
- Only upload media you own or have permission to distribute.
