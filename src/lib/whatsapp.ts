import twilio from "twilio";

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM } = process.env;

// WhatsApp pela Twilio (mesma conta do SMS). Sem configuração, só registra no log.
export async function enviarWhatsapp(para: string, texto: string) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
    console.log(`[WhatsApp simulado] ${para}: ${texto}`);
    return;
  }
  await twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN).messages.create({
    from: `whatsapp:${TWILIO_WHATSAPP_FROM}`,
    to: `whatsapp:${para}`,
    body: texto,
  });
}
