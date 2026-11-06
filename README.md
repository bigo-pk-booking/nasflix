# NASFLIX
Free-first entertainment catalogue for creator-owned movies, AI videos, series and music.

## Cloudflare Pages
Framework preset: None. Build command: blank. Build output directory: `/`. Production branch: `main`.

## D1 binding
Pages project → Settings → Bindings → Add → D1 database:
- Variable name: `DB`
- Database: `nasflix-db`

Run this SQL in the D1 Console:
```sql
CREATE TABLE IF NOT EXISTS media_links (
 id TEXT PRIMARY KEY,
 title TEXT NOT NULL,
 type TEXT NOT NULL CHECK (type IN ('Movie','AI Video','Series','Music')),
 genre TEXT NOT NULL DEFAULT 'Independent',
 description TEXT NOT NULL DEFAULT '',
 media_url TEXT NOT NULL,
 allow_download INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_media_links_created_at ON media_links(created_at DESC);
```

## Admin secret
Pages project → Settings → Variables and Secrets: add a production secret named `ADMIN_TOKEN` with a long random private value. Keep it secret; never commit it to GitHub or send it in chat. Redeploy after changing bindings or secrets.

## Media hosting
This version stores catalogue details and media URLs in D1; it does not upload media files to Cloudflare. Use direct media URLs or permitted platform links. Direct MP4/WebM/MP3 links can play in the player; ordinary platform pages may need an allowed embed or external opening. Only share media you own or are licensed to distribute. Enable downloads only when permitted.

Cloudflare free allowances and third-party media-hosting plans have limits and may change. No R2 bucket is required for this link-based version.