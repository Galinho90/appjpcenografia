// Helper compartilhado: carrega template do banco e faz interpolação simples {{var}}
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export interface RenderedTemplate {
  subject: string;
  html: string;
}

export function renderTemplateString(tpl: string, vars: Record<string, string | number | null | undefined>): string {
  return tpl.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const v = vars[key];
    return v === undefined || v === null ? "" : String(v);
  });
}

// deno-lint-ignore no-explicit-any
export async function loadAndRenderTemplate(admin: any, key: string, vars: Record<string, string | number | null | undefined>): Promise<RenderedTemplate | null> {
  const { data, error } = await admin
    .from("email_templates")
    .select("subject, html")
    .eq("key", key)
    .maybeSingle();
  if (error || !data) return null;
  return {
    subject: renderTemplateString(data.subject, vars),
    html: renderTemplateString(data.html, vars),
  };
}

export function _exportForFunctionsRuntime() {
  // No-op: forces createClient import to be used (some bundlers tree-shake otherwise)
  return createClient;
}
