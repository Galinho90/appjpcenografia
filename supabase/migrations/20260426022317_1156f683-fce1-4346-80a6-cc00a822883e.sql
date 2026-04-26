INSERT INTO public.email_templates (key, description, subject, html, variables) VALUES
(
  'nota_fiscal_rejeitada',
  'Enviado ao colaborador quando a nota fiscal é rejeitada',
  'Sua nota fiscal foi rejeitada - {{empresa}}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Nota Fiscal Rejeitada</title></head><body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <tr><td style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:32px 24px;color:#ffffff;text-align:center;">
          <h1 style="margin:0;font-size:22px;font-weight:600;">❌ Nota Fiscal Rejeitada</h1>
        </td></tr>
        <tr><td style="padding:32px 24px;">
          <p style="margin:0 0 16px;font-size:16px;">Olá <strong>{{nome}}</strong>,</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">Infelizmente sua nota fiscal foi <strong style="color:#dc2626;">rejeitada</strong> e precisa ser reenviada.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border-left:4px solid #dc2626;border-radius:6px;margin:20px 0;">
            <tr><td style="padding:16px 20px;">
              <p style="margin:0 0 8px;font-size:13px;color:#991b1b;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Motivo da rejeição</p>
              <p style="margin:0;font-size:15px;color:#18181b;line-height:1.5;">{{motivo}}</p>
            </td></tr>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;border-radius:8px;margin:20px 0;">
            <tr><td style="padding:16px 20px;font-size:14px;color:#52525b;">
              <p style="margin:0 0 6px;"><strong>Nota:</strong> {{numero}}</p>
              <p style="margin:0 0 6px;"><strong>Período:</strong> {{periodo_inicio}} a {{periodo_fim}}</p>
              <p style="margin:0;"><strong>Valor:</strong> R$ {{valor}}</p>
            </td></tr>
          </table>
          <p style="margin:24px 0 16px;font-size:15px;color:#52525b;line-height:1.6;">Por favor, corrija as informações apontadas e envie uma nova nota fiscal através do sistema.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
            <tr><td style="background:#dc2626;border-radius:8px;">
              <a href="{{link}}" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;">Reenviar Nota Fiscal</a>
            </td></tr>
          </table>
          <p style="margin:24px 0 0;font-size:13px;color:#71717a;">Em caso de dúvidas, entre em contato com a equipe administrativa.</p>
        </td></tr>
        <tr><td style="background:#fafafa;padding:20px 24px;text-align:center;border-top:1px solid #e4e4e7;">
          <p style="margin:0;font-size:12px;color:#a1a1aa;">{{empresa}} • Email automático, não responda</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>',
  '["nome","empresa","numero","motivo","periodo_inicio","periodo_fim","valor","link"]'::jsonb
)
ON CONFLICT (key) DO NOTHING;