// Cloudflare Pages Function: keep Mail.tm requests same-origin so mobile browsers
// do not need to call the third-party API directly (avoids browser CORS restrictions).
export async function onRequest({ request, params }) {
  const method = request.method.toUpperCase();
  if (!["GET", "POST", "DELETE"].includes(method)) {
    return new Response("Method not allowed", { status: 405, headers: { "Allow": "GET, POST, DELETE" } });
  }

  const rawPath = params?.path;
  const path = Array.isArray(rawPath) ? rawPath.join("/") : (rawPath || "");
  if (path.split("/").some(part => part === "." || part === "..")) {
    return new Response("Invalid API path", { status: 400 });
  }

  const incoming = new URL(request.url);
  const target = new URL("https://api.mail.tm/" + path);
  target.search = incoming.search;

  const headers = new Headers();
  headers.set("Accept", request.headers.get("Accept") || "application/ld+json, application/json");
  const authorization = request.headers.get("Authorization");
  if (authorization) headers.set("Authorization", authorization);
  const contentType = request.headers.get("Content-Type");
  if (contentType) headers.set("Content-Type", contentType);

  try {
    const upstream = await fetch(target.toString(), {
      method,
      headers,
      body: method === "GET" || method === "DELETE" ? undefined : request.body,
    });
    const responseHeaders = new Headers();
    const upstreamType = upstream.headers.get("Content-Type");
    if (upstreamType) responseHeaders.set("Content-Type", upstreamType);
    responseHeaders.set("Cache-Control", "no-store");
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch (_) {
    return Response.json({ message: "Mail provider could not be reached from the server. Please try again shortly." }, { status: 502 });
  }
}
