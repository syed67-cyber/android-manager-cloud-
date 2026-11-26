// Cloudflare Pages Function adapter for the official Guerrilla Mail JSON API.
function json(data, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
async function apiCall(params, request, sidToken) {
  const url = new URL("https://api.guerrillamail.com/ajax.php");
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }
  url.searchParams.set("ip", request.headers.get("CF-Connecting-IP") || "0.0.0.0");
  url.searchParams.set("agent", (request.headers.get("User-Agent") || "AndroidManagerCloud").slice(0, 160));
  if (sidToken) url.searchParams.set("sid_token", sidToken);
  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json", "User-Agent": "AndroidManagerCloud/1.0" }
  });
  if (!response.ok) throw new Error("Guerrilla Mail API returned HTTP " + response.status);
  const data = await response.json();
  if (data?.error || data?.success === false) throw new Error(data.error || data.message || "Guerrilla Mail rejected the request.");
  return data;
}
function tokenFromRequest(request) {
  const auth = request.headers.get("Authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}
export async function onRequest({ request, params }) {
  const method = request.method.toUpperCase();
  const rawPath = params?.path;
  const path = Array.isArray(rawPath) ? rawPath.join("/") : (rawPath || "");
  try {
    if (method === "POST" && path === "token") {
      const data = await apiCall({ f: "get_email_address", lang: "en" }, request);
      if (!data.sid_token || !data.email_addr) return json({ message: "Guerrilla Mail did not return a mailbox session." }, 502);
      return json({ token: data.sid_token, email_addr: data.email_addr, email_timestamp: data.email_timestamp });
    }
    const sidToken = tokenFromRequest(request);
    if (!sidToken) return json({ message: "Mailbox session missing. Generate a new inbox." }, 401);
    if (method === "GET" && path === "messages") {
      const data = await apiCall({ f: "get_email_list", offset: 0 }, request, sidToken);
      const messages = Array.isArray(data.list) ? data.list : [];
      return json({ "hydra:member": messages.map(message => ({
        id: String(message.mail_id),
        from: { address: message.mail_from || "Unknown sender" },
        subject: message.mail_subject || "(no subject)",
        intro: message.mail_excerpt || ""
      })) });
    }
    const messageMatch = path.match(/^messages\/([a-zA-Z0-9_-]+)$/);
    if (method === "GET" && messageMatch) {
      const data = await apiCall({ f: "fetch_email", email_id: messageMatch[1] }, request, sidToken);
      const message = data.email || data;
      return json({
        id: String(message.mail_id || messageMatch[1]),
        from: { address: message.mail_from || "Unknown sender" },
        subject: message.mail_subject || "(no subject)",
        text: message.mail_body || message.mail_text || message.mail_excerpt || "",
        html: message.mail_body ? [message.mail_body] : [],
        intro: message.mail_excerpt || message.mail_subject || ""
      });
    }
    return json({ message: "Not found." }, 404);
  } catch (error) {
    return json({ message: error?.message || "Temporary mail provider request failed." }, 502);
  }
}
