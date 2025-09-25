// Supabase Edge Function: get-briq-status
// Returns whether the required BRIQ_API_KEY is configured on the server
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}

serve((req) => {
  if (req.method === "OPTIONS") return json({});
  if (req.method !== "GET" && req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const hasKey = !!Deno.env.get("BRIQ_API_KEY");
  const baseUrl = Deno.env.get("BRIQ_BASE_URL") || "https://karibu.briq.tz";
  return json({ ok: true, hasKey, baseUrl });
});
