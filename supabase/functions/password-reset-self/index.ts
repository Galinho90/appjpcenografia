// Edge Function: password-reset-self
// Recebe { telefone } (chamado pelo próprio usuário sem autenticação)
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

const schema = z.object({ telefone: z.string().min(10) });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return json({ error: "Payload inválido" }, 400);

    // Normaliza telefone para comparar independente de máscara ou DDI 55
    const digits = normalizeLocalPhone(parsed.data.telefone);
    const internalEmail = `${withBrazilCountryCode(digits)}@jpcenografia.local`;

    // Busca comparando apenas dígitos (telefone pode estar formatado no banco)
    const { data: candidatos, error: colabErr } = await admin
      .from("colaboradores")
      .select("id, nome, email, user_id, telefone")
      .not("telefone", "is", null);
    if (colabErr) throw colabErr;
    let colab = (candidatos ?? []).find(
      (c) => normalizeLocalPhone(c.telefone ?? "") === digits
    );

    // Fallback: o login do diarista é um e-mail interno derivado do celular.
    // Se o telefone cadastrado divergir, ainda tentamos localizar pelo Auth user.
    if (!colab) {
      let authUserId: string | null = null;
      for (let page = 1; page <= 20 && !authUserId; page++) {
        const { data: usersPage, error: listErr } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (listErr) throw listErr;
        const found = usersPage.users.find((u) => {
          const emailMatches = (u.email ?? "").toLowerCase() === internalEmail;
          const phoneMatches = normalizeLocalPhone(String(u.user_metadata?.phone ?? "")) === digits;
          return emailMatches || phoneMatches;
        });
        authUserId = found?.id ?? null;
        if (usersPage.users.length < 200) break;
      }

      if (authUserId) {
        const { data: colabByUser, error: colabByUserErr } = await admin
          .from("colaboradores")
          .select("id, nome, email, user_id, telefone")
          .eq("user_id", authUserId)
          .maybeSingle();
        if (colabByUserErr) throw colabByUserErr;
        colab = colabByUser ?? undefined;
      }
    }

    if (!colab || !colab.email || !colab.user_id) {
      console.warn("Password reset skipped: colaborador not found or incomplete", { telefone: digits });
      return json({ ok: true });
    }

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

    // Carrega nome da empresa para variáveis
    const { data: empresa } = await admin
      .from("configuracoes_empresa")
      .select("razao_social, nome_fantasia")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    const empresaNome = empresa?.nome_fantasia || empresa?.razao_social || "Sistema";

    const vars = {
      nome: colab.nome ?? "",
      empresa: empresaNome,
      link,
    };

    const rendered = await loadAndRenderTemplate(admin, "password_reset", vars);
    const subject = rendered?.subject ?? renderTemplateString("Redefinição de senha — {{empresa}}", vars);
    const html = rendered?.html ?? `<p>Olá ${escapeHtml(colab.nome ?? "")}, redefina sua senha: <a href="${link}">${link}</a></p>`;

    const sendRes = await fetch(`${SUPABASE_URL}/functions/v1/smtp-send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE}`,
      },
      body: JSON.stringify({
        action: "send",
        to: colab.email,
        subject,
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

function onlyDigits(input: string): string {
  return (input || "").replace(/\D/g, "");
}

function normalizeLocalPhone(input: string): string {
  const digits = onlyDigits(input);
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    return digits.slice(2);
  }
  return digits;
}

function withBrazilCountryCode(localDigits: string): string {
  if ((localDigits.length === 12 || localDigits.length === 13) && localDigits.startsWith("55")) {
    return localDigits;
  }
  return `55${localDigits}`;
}
