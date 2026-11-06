const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED = new Set([
  "video/mp4", "video/webm", "audio/mpeg", "audio/mp4", "audio/ogg",
  "audio/wav", "image/jpeg", "image/png", "image/webp"
]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

function safeName(name) {
  return String(name || "media").normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100) || "media";
}

function authorized(request, env) {
  const expected = env.ADMIN_TOKEN;
  const supplied = request.headers.get("authorization") || "";
  if (!expected || !supplied.startsWith("Bearer ")) return false;
  const token = supplied.slice(7);
  if (token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  if (!env.DB || !env.MEDIA_BUCKET) {
    return json({ error: "Storage is not configured yet. Bind the D1 database and R2 bucket in Cloudflare Pages settings." }, 503);
  }

  if (request.method === "GET" && path === "/api/media") {
    const { results = [] } = await env.DB.prepare(
      "SELECT id, title, type, genre, description, object_key, content_type, size, allow_download, created_at FROM media ORDER BY created_at DESC"
    ).all();
    return json(results.map(item => ({ ...item, url: "/media/" + encodeURIComponent(item.object_key) })));
  }

  if (request.method === "POST" && path === "/api/upload") {
    if (!authorized(request, env)) return json({ error: "Unauthorized. Enter the correct admin access key." }, 401);
    let form;
    try { form = await request.formData(); } catch { return json({ error: "Invalid upload form." }, 400); }
    const file = form.get("file");
    const title = String(form.get("title") || "").trim();
    const type = String(form.get("type") || "Movie");
    const genre = String(form.get("genre") || "Independent").trim().slice(0, 35);
    const description = String(form.get("description") || "").trim().slice(0, 400);
    const allowDownload = form.get("allowDownload") === "true";

    if (!(file instanceof File) || !title) return json({ error: "A title and media file are required." }, 400);
    if (file.size < 1 || file.size > MAX_FILE_SIZE) return json({ error: "File must be smaller than 50 MB for this starter upload system." }, 413);
    if (!ALLOWED.has(file.type)) return json({ error: "Unsupported file type. Use MP4, WebM, MP3, M4A, OGG, WAV, JPG, PNG or WebP." }, 415);
    if (!["Movie", "AI Video", "Series", "Music"].includes(type)) return json({ error: "Invalid content type." }, 400);

    const id = crypto.randomUUID();
    const objectKey = id + "/" + safeName(file.name);
    await env.MEDIA_BUCKET.put(objectKey, file.stream(), {
      httpMetadata: { contentType: file.type, cacheControl: "public, max-age=3600" },
      customMetadata: { title, originalName: safeName(file.name) }
    });
    try {
      await env.DB.prepare(
        "INSERT INTO media (id, title, type, genre, description, object_key, content_type, size, allow_download) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(id, title, type, genre, description, objectKey, file.type, file.size, allowDownload ? 1 : 0).run();
    } catch (error) {
      await env.MEDIA_BUCKET.delete(objectKey);
      throw error;
    }
    return json({ ok: true, item: { id, title, type, genre, description, url: "/media/" + encodeURIComponent(objectKey), download: allowDownload } }, 201);
  }

  if (request.method === "DELETE" && path.startsWith("/api/media/")) {
    if (!authorized(request, env)) return json({ error: "Unauthorized." }, 401);
    const id = path.split("/").pop();
    const row = await env.DB.prepare("SELECT object_key FROM media WHERE id = ?").bind(id).first();
    if (!row) return json({ error: "Content not found." }, 404);
    await env.MEDIA_BUCKET.delete(row.object_key);
    await env.DB.prepare("DELETE FROM media WHERE id = ?").bind(id).run();
    return json({ ok: true });
  }

  if (request.method === "GET" && path.startsWith("/media/")) {
    const key = decodeURIComponent(path.slice("/media/".length));
    const object = await env.MEDIA_BUCKET.get(key);
    if (!object) return new Response("Not found", { status: 404 });
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("x-content-type-options", "nosniff");
    headers.set("cache-control", "public, max-age=3600");
    return new Response(object.body, { headers });
  }

  return json({ error: "Not found." }, 404);
}
