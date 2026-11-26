// Cloudflare Pages Function: compatibility adapter for the free 1secmail API.
// 1secmail mailboxes are public and unauthenticated; the address acts as the mailbox key.
function json(data, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
function mailboxFromRequest(request) {
  const auth = request.headers.get("Authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  const address = match?.[1] || "";
  if (!/^[a-z0-9._+-]+@[a-z0-9.-]+$/i.test(address)) return null;
  return address;
}
function splitAddress(address) {
  const at = address.lastIndexOf("@");
  return [address.slice(0, at), address.slice(at + 1)];
}
async function upstream(params) {
  const url = new URL("https://www.1secmail.com/api/v1/");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  const response = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Temporary mail provider returned HTTP " + response.status);
  return response.json();
}
export async function onRequest({ request, params }) {
  const method = request.method.toUpperCase();
  const rawPath = params?.path;
  const path = Array.isArray(rawPath) ? rawPath.join("/") : (rawPath || "");
  try {
    if (method === "GET" && path === "domains") {
      const domains = await upstream({ action: "getDomainList" });
      return json({ "hydra:member": (Array.isArray(domains) ? domains : []).map(domain => ({ domain, isActive: true, isPrivate: false })) });
    }
    if (method === "POST" && path === "accounts") {
      const body = await request.json();
      if (!/^[a-z0-9._+-]+@[a-z0-9.-]+$/i.test(body.address || "")) return json({ message: "Invalid mailbox address." }, 400);
      return json({ address: body.address });
    }
    if (method === "POST" && path === "token") {
      const body = await request.json();
      if (!/^[a-z0-9._+-]+@[a-z0-9.-]+$/i.test(body.address || "")) return json({ message: "Invalid mailbox address." }, 400);
      return json({ token: body.address });
    }
    if (method === "GET" && path === "messages") {
      const address = mailboxFromRequest(request);
      if (!address) return json({ message: "Mailbox address missing. Generate a new inbox." }, 401);
      const [login, domain] = splitAddress(address);
      const messages = await upstream({ action: "getMessages", login, domain });
      return json({ "hydra:member": (Array.isArray(messages) ? messages : []).map(message => ({
        id: String(message.id),
        from: { address: message.from || message.from_email || "Unknown sender" },
        subject: message.subject || "(no subject)",
        intro: message.subject || ""
      })) });
    }
    const messageMatch = path.match(/^messages\/([a-zA-Z0-9_-]+)$/);
    if (method === "GET" && messageMatch) {
      const address = mailboxFromRequest(request);
      if (!address) return json({ message: "Mailbox address missing. Generate a new inbox." }, 401);
      const [login, domain] = splitAddress(address);
      const message = await upstream({ action: "readMessage", login, domain, id: messageMatch[1] });
      if (!message || !message.id) return json({ message: "Message not found." }, 404);
      return json({
        id: String(message.id),
        from: { address: message.from || message.from_email || "Unknown sender" },
        subject: message.subject || "(no subject)",
        text: message.textBody || message.body || "",
        html: message.htmlBody ? [message.htmlBody] : [],
        intro: message.textBody || message.subject || ""
      });
    }
    return json({ message: "Not found." }, 404);
  } catch (error) {
    return json({ message: error?.message || "Temporary mail provider request failed." }, 502);
  }
}
