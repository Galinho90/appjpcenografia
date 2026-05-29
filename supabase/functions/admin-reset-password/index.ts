import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createLocalJWKSet, jwtVerify, type JWTPayload } from "https://esm.sh/jose@5.9.6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SupabaseClaims = JWTPayload & { sub: string };

function parseJwks(raw: string) {
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed?.keys)) return parsed;
  if (Array.isArray(parsed)) return { keys: parsed };
  return { keys: [parsed] };
}

async function getCallerIdFromToken(token: string, admin: ReturnType<typeof createClient>): Promise<string | null> {
  const jwksRaw = Deno.env.get("SUPABASE_JWKS");
  if (jwksRaw) {
    try {
      const jwks = createLocalJWKSet(parseJwks(jwksRaw));
      const { payload } = await jwtVerify(token, jwks);
      const claims = payload as SupabaseClaims;
      if (typeof claims.sub === "string" && claims.sub) return claims.sub;
    } catch {
      // Fallback para getUser abaixo quando o token/sig não puder ser validado via JWKS local.
    }
  }

  const { data: userData } = await admin.auth.getUser(token);
  return userData?.user?.id ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const admin = createClient(supabaseUrl, serviceKey);

    const token = authHeader.replace("Bearer ", "");
    const callerId = await getCallerIdFromToken(token, admin);
    if (!callerId) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin, error: roleErr } = await admin.rpc("has_role", {
      _user_id: callerId,
      _role: "admin",
    });
    if (roleErr || !isAdmin) {
      return new Response(JSON.stringify({ error: "Apenas admin pode resetar senhas" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { user_id, new_password } = body as { user_id?: string; new_password?: string };

    if (!user_id || !new_password) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios: user_id, new_password" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (new_password.length < 6) {
      return new Response(JSON.stringify({ error: "Senha mínima 6 caracteres" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updErr } = await admin.auth.admin.updateUserById(user_id, { password: new_password });
    if (updErr) {
      return new Response(JSON.stringify({ error: updErr.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
