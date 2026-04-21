// Edge Function: c6-pix-pagamento
// Envia pagamento PIX via API do C6 Bank PJ e registra log em transacoes_log.
// Em desenvolvimento: se credenciais não estiverem configuradas, opera em modo MOCK.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type PixRequest = {
  fechamento_id: string;
  valor: number;
  chave_pix: string;
  tipo_chave?: "cpf" | "cnpj" | "email" | "telefone" | "evp";
  descricao?: string;
  favorecido?: {
    nome?: string;
    documento?: string;
  };
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function validateBody(raw: unknown): { ok: true; data: PixRequest } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "body inválido" };
  const b = raw as Record<string, unknown>;
  if (typeof b.fechamento_id !== "string" || !b.fechamento_id)
    return { ok: false, error: "fechamento_id é obrigatório" };
  if (typeof b.valor !== "number" || !isFinite(b.valor) || b.valor <= 0)
    return { ok: false, error: "valor deve ser número positivo" };
  if (typeof b.chave_pix !== "string" || !b.chave_pix)
    return { ok: false, error: "chave_pix é obrigatória" };
  return { ok: true, data: b as unknown as PixRequest };
}

async function getC6AccessToken(opts: {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  certPem: string;
  keyPem: string;
}): Promise<string> {
  // OAuth2 client_credentials com mTLS.
  // Observação: Deno edge-runtime não suporta client cert customizado em fetch nativamente.
  // Quando mTLS for exigido, o deploy exigirá runtime compatível ou proxy intermediário.
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: opts.clientId,
    client_secret: opts.clientSecret,
    scope: "pix.write pix.read",
  });

  const resp = await fetch(`${opts.baseUrl}/auth/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`C6 auth falhou [${resp.status}]: ${txt}`);
  }
  const data = await resp.json();
  if (!data?.access_token) throw new Error("C6 auth: access_token ausente");
  return data.access_token as string;
}

async function enviarPixC6(opts: {
  baseUrl: string;
  token: string;
  conta: string;
  payload: PixRequest;
}): Promise<{ id: string; status: string; raw: unknown }> {
  const body = {
    valor: opts.payload.valor.toFixed(2),
    chave: opts.payload.chave_pix,
    tipoChave: opts.payload.tipo_chave ?? "cpf",
    descricao: opts.payload.descricao ?? "Pagamento de diárias",
    contaOrigem: opts.conta,
    favorecido: opts.payload.favorecido ?? {},
  };

  const resp = await fetch(`${opts.baseUrl}/pix/v1/pagamentos`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const raw = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw Object.assign(new Error(`C6 PIX falhou [${resp.status}]`), { raw });
  }
  return {
    id: (raw as any)?.id ?? (raw as any)?.transactionId ?? crypto.randomUUID(),
    status: (raw as any)?.status ?? "processando",
    raw,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "método não permitido" });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(500, { error: "Supabase env ausente" });
  }

  // Autenticação do chamador
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json(401, { error: "Unauthorized" });
  }
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claims?.claims) {
    return json(401, { error: "Unauthorized" });
  }
  const userId = claims.claims.sub as string;

  // Autorização: apenas admin pode disparar pagamentos
  const { data: isAdmin, error: roleErr } = await userClient.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleErr) return json(500, { error: `Falha ao checar papel: ${roleErr.message}` });
  if (!isAdmin) return json(403, { error: "Apenas admin pode iniciar pagamentos PIX" });

  // Validação do body
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json(400, { error: "JSON inválido" });
  }
  const parsed = validateBody(raw);
  if (!parsed.ok) return json(400, { error: parsed.error });
  const payload = parsed.data;

  // Cliente admin para gravar logs e atualizar fechamento
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Credenciais C6
  const C6_BASE_URL = Deno.env.get("C6_BASE_URL") ?? "https://baasgateway-homolog.c6bank.com.br";
  const C6_CLIENT_ID = Deno.env.get("C6_CLIENT_ID");
  const C6_CLIENT_SECRET = Deno.env.get("C6_CLIENT_SECRET");
  const C6_CERT_PEM = Deno.env.get("C6_CERT_PEM");
  const C6_KEY_PEM = Deno.env.get("C6_KEY_PEM");
  const C6_CONTA = Deno.env.get("C6_CONTA_CORRENTE");

  const mockMode = !C6_CLIENT_ID || !C6_CLIENT_SECRET || !C6_CERT_PEM || !C6_KEY_PEM || !C6_CONTA;

  let resultado: { id: string; status: string; raw: unknown };
  let logStatus: "sucesso" | "erro" = "sucesso";
  let logRaw: unknown;

  try {
    if (mockMode) {
      resultado = {
        id: `mock-${crypto.randomUUID()}`,
        status: "processando",
        raw: { mock: true, aviso: "Credenciais C6 ausentes; execução em modo desenvolvimento." },
      };
    } else {
      const accessToken = await getC6AccessToken({
        baseUrl: C6_BASE_URL,
        clientId: C6_CLIENT_ID!,
        clientSecret: C6_CLIENT_SECRET!,
        certPem: C6_CERT_PEM!,
        keyPem: C6_KEY_PEM!,
      });
      resultado = await enviarPixC6({
        baseUrl: C6_BASE_URL,
        token: accessToken,
        conta: C6_CONTA!,
        payload,
      });
    }
    logRaw = { request: { ...payload, chave_pix: "***" }, response: resultado.raw, mock: mockMode };
  } catch (e: unknown) {
    logStatus = "erro";
    const msg = e instanceof Error ? e.message : "erro desconhecido";
    logRaw = {
      request: { ...payload, chave_pix: "***" },
      error: msg,
      details: (e as any)?.raw ?? null,
      mock: mockMode,
    };
    resultado = { id: "", status: "erro", raw: logRaw };
  }

  // Registra log
  const { error: logErr } = await admin.from("transacoes_log").insert({
    fechamento_id: payload.fechamento_id,
    valor: payload.valor,
    tipo: "pix",
    status: logStatus === "sucesso" ? "enviado" : "erro",
    resposta_api: logRaw as any,
  });
  if (logErr) {
    console.error("Erro ao gravar transacoes_log:", logErr);
  }

  // Atualiza status do fechamento quando sucesso (apenas marcação de envio)
  if (logStatus === "sucesso" && !mockMode) {
    await admin
      .from("fechamentos")
      .update({ status: "pago" })
      .eq("id", payload.fechamento_id);
  }

  if (logStatus === "erro") {
    return json(502, { ok: false, mock: mockMode, error: (logRaw as any).error, details: logRaw });
  }

  return json(200, {
    ok: true,
    mock: mockMode,
    transacao_id: resultado.id,
    status: resultado.status,
  });
});
