import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const BASE = "https://portal.1delta.io/v1";
const API_KEY = Deno.env.get("ONEDELTA_API_KEY") || "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const account = url.searchParams.get("account");
    const chains = url.searchParams.get("chains") ?? "1,8453";

    if (!account || !/^0x[a-fA-F0-9]{40}$/.test(account)) {
      return new Response(JSON.stringify({ error: "valid account address required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiUrl = new URL(BASE + "/data/lending/user-positions");
    apiUrl.searchParams.set("account", account);
    apiUrl.searchParams.set("chains", chains);

    const headers: Record<string, string> = {};
    if (API_KEY) headers["x-api-key"] = API_KEY;

    const res = await fetch(apiUrl.toString(), {
      headers,
      signal: AbortSignal.timeout(12_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`1delta positions ${res.status}: ${body.slice(0, 200)}`);
      return new Response(JSON.stringify({ error: `upstream error ${res.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("user-positions error:", err.message);
    return new Response(JSON.stringify({ error: err.message ?? "internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
