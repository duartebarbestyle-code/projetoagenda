const { RESEND_API_KEY, EMAIL_FROM } = process.env;

export async function enviarEmail(para: string, assunto: string, texto: string) {
  if (!RESEND_API_KEY || !EMAIL_FROM) {
    console.log(`[E-mail simulado] ${para}: ${assunto} — ${texto}`);
    return;
  }
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: EMAIL_FROM, to: para, subject: assunto, text: texto }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
}
