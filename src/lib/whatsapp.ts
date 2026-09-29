const { WHATSAPP_TOKEN, WHATSAPP_PHONE_ID } = process.env;
const API = "https://graph.facebook.com/v23.0";

// Modelos cadastrados e aprovados na Meta (WhatsApp Manager), idioma pt_BR. Texto de cada um no README.
export type Modelo =
  | "agendamento_confirmado"
  | "agendamento_alterado"
  | "agendamento_cancelado"
  | "lembrete_agendamento"
  | "aviso_barbeiro"
  | "agenda_do_dia";

// Parâmetro de modelo não aceita quebra de linha, tab, 4+ espaços seguidos nem texto vazio
const limpar = (t: string) => t.replace(/[\n\t]+/g, " ").replace(/ {4,}/g, " ").trim() || "-";

// WhatsApp Cloud API (Meta). Mensagem enviada pela barbearia só sai por modelo aprovado;
// parametros preenchem {{1}}, {{2}}... na ordem. Sem configuração, só registra no log.
export async function enviarWhatsapp(para: string, modelo: Modelo, parametros: string[]) {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
    console.log(`[WhatsApp simulado] ${para} (${modelo}): ${parametros.join(" | ")}`);
    return;
  }
  const r = await fetch(`${API}/${WHATSAPP_PHONE_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: para.replace(/\D/g, ""),
      type: "template",
      template: {
        name: modelo,
        language: { code: "pt_BR" },
        components: [{ type: "body", parameters: parametros.map((p) => ({ type: "text", text: limpar(p) })) }],
      },
    }),
  });
  if (!r.ok) throw new Error(`WhatsApp ${r.status}: ${await r.text()}`);
}
