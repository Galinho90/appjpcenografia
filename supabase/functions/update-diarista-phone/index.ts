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

const PHONE_EMAIL_DOMAIN = "jpcenografia.local";

function onlyDigits(s: string) {
  return (s || "").replace(/\D/g, "");
}
function normalizePhoneBR(input: string): string {
  const d = onlyDigits(input);
  if (!d) return "";
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) return `+${d}`;
  if (d.length === 10 || d.length === 11) return `+55${d}`;
  return `+${d}`;
}
function phoneToEmail(phone: string): string {
  const digits = onlyDigits(normalizePhoneBR(phone));
  return `${digits}@${PHONE_EMAIL_DOMAIN}`;
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

    const { data: isAllowed } = await admin.rpc("is_admin_or_gerente", {
      _user_id: callerId,
    });
    if (!isAllowed) {
      return new Response(JSON.stringify({ error: "Apenas admin/gerente pode alterar acesso" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { colaborador_id, phone } = await req.json().catch(() => ({}));
    if (!colaborador_id || !phone) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios: colaborador_id, phone" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: colab, error: colabErr } = await admin
      .from("colaboradores")
      .select("id, user_id")
      .eq("id", colaborador_id)
      .maybeSingle();
    if (colabErr || !colab) {
      return new Response(JSON.stringify({ error: "Diarista não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!colab.user_id) {
      return new Response(JSON.stringify({ ok: true, skipped: "sem acesso vinculado" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = phoneToEmail(phone);
    const e164 = normalizePhoneBR(phone);

    // Verifica se já existe outro auth user com esse email
    for (let page = 1; page <= 10; page++) {
      const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (listErr) break;
      const u = list.users.find((x) => (x.email ?? "").toLowerCase() === email.toLowerCase());
      if (u && u.id !== colab.user_id) {
        return new Response(JSON.stringify({ error: "Este celular já está em uso por outro acesso" }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (list.users.length < 200) break;
    }

    const { error: updErr } = await admin.auth.admin.updateUserById(colab.user_id, {
      email,
      email_confirm: true,
      user_metadata: { phone: e164 },
    });
    if (updErr) {
      return new Response(JSON.stringify({ error: updErr.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, login: e164 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
