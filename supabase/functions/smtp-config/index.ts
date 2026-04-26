// Edge Function: smtp-config
// GET  -> retorna a config atual (com senha mascarada)
// POST -> cria/atualiza a config (cifra a senha antes de gravar)
// Acesso restrito a admin/gerente (verificado em código).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { encryptSecret } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const upsertSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  secure: z.enum(["tls", "ssl", "none"]),
  username: z.string().min(1),
  password: z.string().optional(), // se vazio em update, mantém a anterior
  from_email: z.string().email(),
  from_name: z.string().optional().nullable(),
  ativo: z.boolean().optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Auth
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Não autenticado" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: "Sessão inválida" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = userData.user.id;

  // Verifica role admin/gerente
  const { data: roleData } = await admin
    .from("user_roles").select("role").eq("user_id", userId);
  const roles = (roleData ?? []).map((r: any) => r.role);
  const allowed = roles.includes("admin") || roles.includes("gerente");
  if (!allowed) {
    return new Response(JSON.stringify({ error: "Acesso negado" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    if (req.method === "GET") {
      const { data, error } = await admin
        .from("smtp_config").select("*")
        .order("updated_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      if (!data) {
        return new Response(JSON.stringify({ config: null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { password_encrypted, ...rest } = data;
      return new Response(JSON.stringify({
        config: { ...rest, password_set: !!password_encrypted },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (req.method === "POST") {
      const json = await req.json();
      const parsed = upsertSchema.safeParse(json);
      if (!parsed.success) {
        return new Response(
          JSON.stringify({ error: "Payload inválido", details: parsed.error.flatten() }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const body = parsed.data;

      // Carrega registro existente
      const { data: existing } = await admin
        .from("smtp_config").select("*")
        .order("updated_at", { ascending: false }).limit(1).maybeSingle();

      let password_encrypted: string;
      if (body.password && body.password.length > 0) {
        password_encrypted = await encryptSecret(body.password);
      } else if (existing?.password_encrypted) {
        password_encrypted = existing.password_encrypted;
      } else {
        return new Response(JSON.stringify({ error: "Senha SMTP é obrigatória" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const payload = {
        host: body.host,
        port: body.port,
        secure: body.secure,
        username: body.username,
        password_encrypted,
        from_email: body.from_email,
        from_name: body.from_name ?? null,
        ativo: body.ativo ?? true,
        updated_by: userId,
      };

      let result;
      if (existing) {
        const { data, error } = await admin
          .from("smtp_config").update(payload).eq("id", existing.id).select().single();
        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await admin
          .from("smtp_config").insert(payload).select().single();
        if (error) throw error;
        result = data;
      }

      const { password_encrypted: _, ...rest } = result;
      return new Response(JSON.stringify({
        config: { ...rest, password_set: true },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Método não suportado" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
