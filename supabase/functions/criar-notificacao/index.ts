// Edge function: insert notifications using the service role.
// Authenticated callers only. Bypasses the (removed) client-side INSERT policy.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Payload = {
  user_id?: string;
  notify_admins?: boolean;
  titulo: string;
  mensagem: string;
  tipo?: string;
  link?: string | null;
  metadata?: unknown;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller JWT
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Payload;
    if (!body?.titulo || !body?.mensagem) {
      return new Response(JSON.stringify({ error: "titulo e mensagem são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Resolve target user ids
    let targetUserIds: string[] = [];
    if (body.notify_admins) {
      const { data: roles, error: rolesErr } = await admin
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["admin", "gerente"]);
      if (rolesErr) throw rolesErr;
      targetUserIds = Array.from(new Set((roles ?? []).map((r: any) => r.user_id)));
    } else if (body.user_id) {
      targetUserIds = [body.user_id];
    }

    if (targetUserIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, inserted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rows = targetUserIds.map((uid) => ({
      user_id: uid,
      titulo: body.titulo,
      mensagem: body.mensagem,
      tipo: body.tipo ?? "info",
      link: body.link ?? null,
      metadata: body.metadata ?? null,
    }));

    const { error: insErr } = await admin.from("notificacoes").insert(rows);
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ ok: true, inserted: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("criar-notificacao error:", e);
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
