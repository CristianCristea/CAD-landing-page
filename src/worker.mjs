const ORIGIN = "https://cad-dev.com";
const SENDER = "contact@cad-dev.com";
const RECIPIENT = "cristian.cristea.dev@gmail.com";
const MAX_BODY_BYTES = 32 * 1024;
const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const FIELDS = new Set(["name", "email", "company", "message", "website", "token"]);
const CONTROLS = /[\u0000-\u001f\u007f]/;

function response(status, code, extra = {}, headers = {}) {
  return Response.json({ ok: status === 200, code, ...extra }, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...headers },
  });
}

async function readBody(request) {
  const length = request.headers.get("Content-Length");
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_BODY_BYTES)) {
    throw new Error("body_too_large");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new Error("invalid_json");
  let size = 0;
  const chunks = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new Error("body_too_large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

function validate(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)
      || Object.keys(input).some(key => !FIELDS.has(key))) return null;
  const values = {};
  const errors = {};
  for (const [field, min, max] of [["name", 1, 100], ["email", 1, 254], ["company", 0, 200], ["message", 1, 5000]]) {
    const raw = field === "company" && input[field] === undefined ? "" : input[field];
    if (typeof raw !== "string" || raw.length > max) {
      errors[field] = `Enter ${field === "company" ? "at most" : "between " + min + " and"} ${max} characters for ${field}.`;
      continue;
    }
    values[field] = raw.trim();
    if (values[field].length < min || (field !== "message" && CONTROLS.test(raw))
        || (field === "message" && /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(raw))) {
      errors[field] = `Enter a valid ${field}.`;
    }
  }
  // A single conventional mailbox only; no display names, lists, or header syntax.
  if (values.email) {
    const parts = values.email.split("@");
    if (parts.length !== 2 || parts[0].length > 64
        || !/^[A-Za-z0-9!#$%&'*+\-/=?^_`{|}~]+(?:\.[A-Za-z0-9!#$%&'*+\-/=?^_`{|}~]+)*$/.test(parts[0])
        || !/^(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/.test(parts[1])) {
      errors.email = "Enter a valid email address.";
    }
  }
  if (typeof input.website !== "string" || input.website.length > 200) return null;
  if (typeof input.token !== "string" || !input.token.trim() || input.token.length > 2048) {
    errors.token = "Complete the verification and try again.";
  }
  return { values, errors };
}

// Inject the verifier transport in tests; production always uses Cloudflare Siteverify.
export function createWorker(verifyFetch = globalThis.fetch) {
  return {
    async fetch(request, env) {
      const url = new URL(request.url);
      if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
      if (url.pathname !== "/api/contact") return response(404, "not_found");
      if (request.method !== "POST") return response(405, "method_not_allowed", {}, { Allow: "POST" });
      if (url.origin !== ORIGIN || request.headers.get("Origin") !== ORIGIN) return response(403, "forbidden");
      if (request.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
        return response(415, "unsupported_media_type");
      }
      let input;
      try { input = await readBody(request); }
      catch (error) { return response(error.message === "body_too_large" ? 413 : 400, error.message === "body_too_large" ? "body_too_large" : "invalid_json"); }
      const checked = validate(input);
      if (!checked) return response(400, "invalid_fields");
      if (input.website !== "") return response(403, "verification_failed");
      if (Object.keys(checked.errors).length) return response(400, "invalid_fields", { fields: checked.errors });
      if (!env.TURNSTILE_SECRET_KEY || !env.CONTACT_EMAIL?.send) return response(503, "unavailable");

      let verification;
      try {
        const result = await verifyFetch(SITEVERIFY, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: input.token }),
          signal: AbortSignal.timeout(8000),
        });
        if (!result.ok) return response(503, "verification_unavailable");
        verification = await result.json();
      } catch { return response(503, "verification_unavailable"); }
      if (verification?.success !== true || verification.hostname !== "cad-dev.com" || verification.action !== "contact") {
        return response(403, "verification_failed");
      }

      const { name, email, company, message } = checked.values;
      try {
        // Await acceptance. Do not use waitUntil or automatically retry a send.
        const accepted = await env.CONTACT_EMAIL.send({
          from: SENDER,
          to: RECIPIENT,
          replyTo: email,
          subject: "CAD Development website enquiry",
          text: `Name: ${name}\nEmail: ${email}\nCompany: ${company || "Not provided"}\n\nMessage:\n${message}`,
        });
        if (!accepted?.messageId) return response(502, "email_unavailable");
      } catch { return response(502, "email_unavailable"); }
      return response(200, "sent");
    },
  };
}

export default createWorker();
