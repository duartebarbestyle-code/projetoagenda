import twilio from "twilio";

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM } = process.env;

export async function enviarSms(para: string, texto: string) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM) {
    console.log(`[SMS simulado] ${para}: ${texto}`);
    return;
  }
  await twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN).messages.create({
    from: TWILIO_FROM,
    to: para,
    body: texto,
  });
}

// Aceita "(11) 91234-5678" ou "+5511912345678" e devolve E.164
export function normalizarCelular(valor: string) {
  const d = valor.replace(/\D/g, "");
  if (d.length === 13 && d.startsWith("55")) return `+${d}`;
  if (d.length === 11) return `+55${d}`;
  return null;
}
