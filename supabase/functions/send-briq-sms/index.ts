// Minimal Deno global declaration for IDE type checking (Supabase runs this on Deno)
declare const Deno: { env: { get(name: string): string | undefined } };
// Supabase Edge Function: send-briq-sms
// Proxies SMS sending to Briq Karibu Messages API
// Reads API key from environment (BRIQ_API_KEY). Do NOT hardcode keys.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

interface RequestBody {
  content: string;
  recipients: string[]; // E.164 without leading '+', e.g., 2557...
  sender_id?: string;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return jsonResponse({}, 200);
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch (_e) {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (!body || typeof body.content !== "string" || !Array.isArray(body.recipients)) {
    return jsonResponse({ error: "content (string) and recipients (string[]) are required" }, 422);
  }

  const recipients = body.recipients.filter((r) => typeof r === "string" && r.trim() !== "");
  if (recipients.length === 0) {
    return jsonResponse({ error: "At least one recipient is required" }, 422);
  }

  // Read Briq API key and base URL from environment
  const apiKey = Deno.env.get("BRIQ_API_KEY");
  const baseUrl = Deno.env.get("BRIQ_BASE_URL") || "https://karibu.briq.tz";

  if (!apiKey) {
    return jsonResponse({ error: "BRIQ_API_KEY is not configured on the server" }, 500);
  }

  try {
    const res = await fetch(`${baseUrl}/v1/message/send-instant`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        content: body.content,
        recipients,
        sender_id: body.sender_id,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return jsonResponse({ error: "Briq send failed", status: res.status, data }, res.status);
    }

    return jsonResponse({ success: true, data });
  } catch (e) {
    return jsonResponse({ error: "Request to Briq failed", details: String(e) }, 502);
  }
});
