import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PHONE_EMAIL_DOMAIN = "jpcenografia.local";

function onlyDigits(s: string) { return (s || "").replace(/\D/g, ""); }
function normalizePhoneBR(input: string): string {
  const d = onlyDigits(input);
  if (!d) return "";
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) return `+${d}`;
  if (d.length === 10 || d.length === 11) return `+55${d}`;
  return `+${d}`;
}
function phoneToEmail(phone: string): string {
  return `${onlyDigits(normalizePhoneBR(phone))}@${PHONE_EMAIL_DOMAIN}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Só permite se NÃO existir nenhum role cadastrado
    const { count, error: countErr } = await admin
      .from("user_roles")
      .select("id", { count: "exact", head: true });
    if (countErr) throw countErr;
    if ((count ?? 0) > 0) {
      return new Response(JSON.stringify({ error: "Já existe usuário cadastrado. Use o painel de admin." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { phone, password, nome } = body as { phone?: string; password?: string; nome?: string };

    if (!phone || !password || !nome) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios: phone, password, nome" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (password.length < 6) {
      return new Response(JSON.stringify({ error: "Senha mínima 6 caracteres" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = phoneToEmail(phone);
    const e164 = normalizePhoneBR(phone);

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome, phone: e164 },
    });
    if (createErr || !created.user) {
      return new Response(JSON.stringify({ error: createErr?.message ?? "Falha ao criar usuário" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: roleErr } = await admin.from("user_roles").insert({
      user_id: created.user.id,
      role: "admin",
    });
    if (roleErr) {
      await admin.auth.admin.deleteUser(created.user.id);
      return new Response(JSON.stringify({ error: roleErr.message }), {
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
