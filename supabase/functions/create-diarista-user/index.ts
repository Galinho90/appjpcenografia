import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // chamador deve ser admin ou gerente
    const { data: isAllowed, error: roleErr } = await admin.rpc("is_admin_or_gerente", {
      _user_id: userData.user.id,
    });
    if (roleErr || !isAllowed) {
      return new Response(JSON.stringify({ error: "Apenas admin/gerente pode criar acesso de diarista" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { phone, password, nome, colaborador_id } = body as {
      phone?: string; password?: string; nome?: string; colaborador_id?: string;
    };

    if (!phone || !password || !nome || !colaborador_id) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios: phone, password, nome, colaborador_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (password.length < 6) {
      return new Response(JSON.stringify({ error: "Senha mínima 6 caracteres" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verifica que colaborador existe e ainda não tem user_id
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
    if (colab.user_id) {
      return new Response(JSON.stringify({ error: "Diarista já possui acesso criado" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = phoneToEmail(phone);
    const e164 = normalizePhoneBR(phone);

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome, phone: e164, colaborador_id },
    });
    if (createErr || !created.user) {
      return new Response(JSON.stringify({ error: createErr?.message ?? "Falha ao criar usuário" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newUserId = created.user.id;

    const { error: roleInsertErr } = await admin.from("user_roles").insert({
      user_id: newUserId,
      role: "visualizador",
    });
    if (roleInsertErr) {
      await admin.auth.admin.deleteUser(newUserId);
      return new Response(JSON.stringify({ error: roleInsertErr.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: linkErr } = await admin
      .from("colaboradores")
      .update({ user_id: newUserId })
      .eq("id", colaborador_id);
    if (linkErr) {
      await admin.from("user_roles").delete().eq("user_id", newUserId);
      await admin.auth.admin.deleteUser(newUserId);
      return new Response(JSON.stringify({ error: linkErr.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, user_id: newUserId, login: e164 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
