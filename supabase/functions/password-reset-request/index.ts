// Edge Function: password-reset-request
// Recebe { colaborador_id } (chamado pelo painel admin)
// Gera token único, salva em password_reset_tokens, envia e-mail via smtp-send.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { loadAndRenderTemplate, renderTemplateString } from "../_shared/templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = (Deno.env.get("APP_PUBLIC_URL") ?? "").replace(/\/$/, "");

const schema = z.object({ colaborador_id: z.string().uuid() });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autenticado" }, 401);
    const { data: userData } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!userData.user) return json({ error: "Sessão inválida" }, 401);

    const { data: roleData } = await admin
      .from("user_roles").select("role").eq("user_id", userData.user.id);
    const roles = (roleData ?? []).map((r: any) => r.role);
    if (!roles.includes("admin") && !roles.includes("gerente")) {
      return json({ error: "Acesso negado" }, 403);
    }

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return json({ error: "Payload inválido" }, 400);

    const { data: colab, error: colabErr } = await admin
      .from("colaboradores")
      .select("id, nome, email, user_id")
      .eq("id", parsed.data.colaborador_id)
      .maybeSingle();
    if (colabErr) throw colabErr;
    if (!colab) return json({ error: "Colaborador não encontrado" }, 404);
    if (!colab.email) return json({ error: "Colaborador não possui e-mail cadastrado" }, 400);
    if (!colab.user_id) return json({ error: "Colaborador sem usuário de acesso vinculado" }, 400);

    // Gera token (32 bytes hex)
    const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
    const token = Array.from(tokenBytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1h

    const { error: tokErr } = await admin.from("password_reset_tokens").insert({
      token,
      user_id: colab.user_id,
      email: colab.email,
      expires_at: expiresAt,
    });
    if (tokErr) throw tokErr;

    if (!APP_URL) {
      return json({ error: "APP_PUBLIC_URL não configurada" }, 500);
    }
    const link = `${APP_URL}/redefinir-senha?token=${token}`;

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
        <h2 style="margin:0 0 12px">Olá, ${escapeHtml(colab.nome ?? "")}</h2>
        <p>Recebemos uma solicitação para redefinir sua senha de acesso ao sistema.</p>
        <p>Clique no botão abaixo para criar uma nova senha. O link expira em 1 hora.</p>
        <p style="margin:28px 0">
          <a href="${link}" style="background:#111;color:#fff;text-decoration:none;padding:12px 20px;border-radius:6px;display:inline-block">Redefinir senha</a>
        </p>
        <p style="font-size:12px;color:#666">Se o botão não funcionar, copie e cole este endereço no navegador:<br>${link}</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
        <p style="font-size:12px;color:#999">Se você não solicitou esta redefinição, ignore este e-mail.</p>
      </div>`;

    const sendRes = await fetch(`${SUPABASE_URL}/functions/v1/smtp-send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE}`,
      },
      body: JSON.stringify({
        action: "send",
        to: colab.email,
        subject: "Redefinição de senha — Sistema JP Cenografia",
        html,
        context: "password_reset",
      }),
    });
    const sendJson = await sendRes.json();
    if (!sendJson.ok) {
      return json({ error: `Falha ao enviar e-mail: ${sendJson.error ?? "desconhecido"}` }, 500);
    }

    return json({ ok: true, sent_to: colab.email });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
