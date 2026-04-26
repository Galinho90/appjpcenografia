INSERT INTO public.email_templates (key, description, subject, html, variables) VALUES
(
  'nota_fiscal_aprovada',
  'Enviado ao colaborador quando a nota fiscal é aprovada',
  'Sua nota fiscal foi aprovada - {{empresa}}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Nota Fiscal Aprovada</title></head><body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <tr><td style="background:linear-gradient(135deg,#16a34a,#15803d);padding:32px 24px;color:#ffffff;text-align:center;">
          <h1 style="margin:0;font-size:22px;font-weight:600;">✅ Nota Fiscal Aprovada</h1>
        </td></tr>
        <tr><td style="padding:32px 24px;">
          <p style="margin:0 0 16px;font-size:16px;">Olá <strong>{{nome}}</strong>,</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Sua nota fiscal foi <strong style="color:#16a34a;">aprovada</strong> com sucesso e o pagamento será processado conforme o prazo combinado.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-left:4px solid #16a34a;border-radius:6px;margin:20px 0;">
            <tr><td style="padding:16px 20px;font-size:14px;color:#166534;">
              <p style="margin:0 0 6px;"><strong>Nota:</strong> {{numero}}</p>
              <p style="margin:0 0 6px;"><strong>Período:</strong> {{periodo_inicio}} a {{periodo_fim}}</p>
              <p style="margin:0;"><strong>Valor:</strong> R$ {{valor}}</p>
            </td></tr>
          </table>
          <p style="margin:24px 0 16px;font-size:15px;color:#52525b;line-height:1.6;">Obrigado pela parceria! Em caso de dúvidas, entre em contato com a equipe administrativa.</p>
        </td></tr>
        <tr><td style="background:#fafafa;padding:20px 24px;text-align:center;border-top:1px solid #e4e4e7;">
          <p style="margin:0;font-size:12px;color:#a1a1aa;">{{empresa}} • Email automático, não responda</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>',
  '["nome","empresa","numero","valor","periodo_inicio","periodo_fim"]'::jsonb
)
ON CONFLICT (key) DO NOTHING;