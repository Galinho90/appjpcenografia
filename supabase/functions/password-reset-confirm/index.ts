// Edge Function: password-reset-confirm
// POST { token, password } -> valida token e atualiza senha do usuário no Auth

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const schema = z.object({
  token: z.string().min(32),
  password: z.string().min(6).max(128),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Dados inválidos" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { token, password } = parsed.data;

    const { data: tok, error: tokErr } = await admin
      .from("password_reset_tokens")
      .select("*").eq("token", token).maybeSingle();
    if (tokErr) throw tokErr;
    if (!tok) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (tok.used_at) {
      return new Response(JSON.stringify({ error: "Token já utilizado" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (new Date(tok.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "Token expirado" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: upErr } = await admin.auth.admin.updateUserById(tok.user_id, { password });
    if (upErr) throw upErr;

    await admin.from("password_reset_tokens")
      .update({ used_at: new Date().toISOString() }).eq("id", tok.id);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// validate token (GET-like via POST with action)
