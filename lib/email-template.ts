/** Modelo visual dos e-mails do TenhaVoz: faixa colorida com a logo, cartão branco, botão. */
const INK = "#16120f";
const PAPER = "#f4eee2";
const URUCUM = "#e8431f";
const SOL = "#ffc61a";

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export interface EmailRow {
  label: string;
  value: string;
  strong?: boolean;
}

export function emailShell(input: {
  siteUrl: string;
  heading: string;
  intro: string;
  rows?: EmailRow[];
  highlight?: { label: string; value: string };
  note?: string;
  cta?: { label: string; url: string };
}): string {
  const rows = (input.rows ?? [])
    .map(
      (r) => `<tr><td style="padding:8px 0;color:#4a423a;font-size:14px;border-bottom:1px solid #d9cfba">${escapeHtml(r.label)}</td><td align="right" style="padding:8px 0;font-size:14px;color:#111827;border-bottom:1px solid #d9cfba;${r.strong ? "font-weight:700;" : ""}">${escapeHtml(r.value)}</td></tr>`
    )
    .join("");
  const highlight = input.highlight
    ? `<div style="margin:20px 0;padding:18px;border-radius:6px;background:${SOL};border:2px solid ${INK};text-align:center"><div style="font-size:13px;color:${INK};font-weight:700">${escapeHtml(input.highlight.label)}</div><div style="font-size:34px;font-weight:900;color:${INK};margin-top:4px">${escapeHtml(input.highlight.value)}</div></div>`
    : "";
  const cta = input.cta
    ? `<div style="text-align:center;margin:24px 0 4px"><a href="${escapeHtml(input.cta.url)}" style="display:inline-block;background:${INK};color:#ffffff;text-decoration:none;font-weight:700;padding:13px 28px;border-radius:999px">${escapeHtml(input.cta.label)}</a></div>`
    : "";
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:${PAPER};font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="height:8px;background:${SOL};font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td style="background:${INK};padding:20px 24px;border-bottom:4px solid ${URUCUM}"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="padding-right:10px"><img src="${escapeHtml(input.siteUrl)}/logo-email.png" width="36" height="36" alt="" style="display:block;border:0"></td>
<td style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:0.5px;text-transform:uppercase">TenhaVoz</td></tr></table></td></tr>
<tr><td style="background:#ffffff;padding:28px 24px;color:${INK}">
<h1 style="margin:0 0 10px;font-size:22px;line-height:1.25;color:${INK};font-weight:900">${escapeHtml(input.heading)}</h1>
<p style="margin:0;font-size:15px;line-height:1.55;color:#2b2520">${escapeHtml(input.intro)}</p>
${highlight}
${rows ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px">${rows}</table>` : ""}
${input.note ? `<p style="margin:18px 0 0;font-size:13px;line-height:1.5;color:#4a423a">${escapeHtml(input.note)}</p>` : ""}
${cta}
</td></tr>
<tr><td align="center" style="padding:16px;font-size:12px;color:#9ca3af">TenhaVoz · ${escapeHtml(input.siteUrl.replace(/^https?:\/\//, ""))}</td></tr>
</table></td></tr></table></body></html>`;
}
