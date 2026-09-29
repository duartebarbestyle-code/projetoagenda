import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clientes } from "@/db/schema";
import { BARBEARIA } from "./config";
import { enviarEmail } from "./email";
import { fmtData, fmtHora } from "./time";
import { enviarWhatsapp, type Modelo } from "./whatsapp";

export type Evento = "confirmado" | "alterado" | "cancelado" | "lembrete";

// O texto do e-mail é o mesmo do modelo de WhatsApp; p = [nome, serviço, data, hora, profissional]
const MENSAGENS: Record<Evento, { modelo: Modelo; assunto: string; texto: (p: string[]) => string }> = {
  confirmado: {
    modelo: "agendamento_confirmado",
    assunto: "horário confirmado",
    texto: (p) => `Olá, ${p[0]}! Seu horário de ${p[1]} está confirmado para ${p[2]} às ${p[3]} com ${p[4]}.`,
  },
  alterado: {
    modelo: "agendamento_alterado",
    assunto: "horário alterado",
    texto: (p) => `Olá, ${p[0]}! Seu horário foi alterado: ${p[1]} em ${p[2]} às ${p[3]} com ${p[4]}.`,
  },
  cancelado: {
    modelo: "agendamento_cancelado",
    assunto: "horário cancelado",
    texto: (p) => `Olá, ${p[0]}. Seu horário de ${p[1]} em ${p[2]} às ${p[3]} foi cancelado.`,
  },
  lembrete: {
    modelo: "lembrete_agendamento",
    assunto: "lembrete do seu horário",
    texto: (p) => `Lembrete, ${p[0]}: ${p[1]} ${p[2]} às ${p[3]} com ${p[4]}.`,
  },
};

// Pelo canal que o cliente escolheu no cadastro; sem e-mail (cadastro do balcão), vai por WhatsApp.
// Falha no envio nunca quebra o fluxo.
export async function avisarCliente(
  userId: string,
  evento: Evento,
  a: { servico: string; inicio: Date; profissional?: string },
) {
  try {
    const [c] = await db
      .select({ nome: clientes.nome, celular: clientes.celular, email: clientes.email, aviso: clientes.aviso })
      .from(clientes)
      .where(eq(clientes.userId, userId));
    if (!c) return;
    const m = MENSAGENS[evento];
    const p = [c.nome, a.servico, fmtData(a.inicio), fmtHora(a.inicio), a.profissional ?? ""];
    if (c.aviso === "email" && c.email) await enviarEmail(c.email, `${BARBEARIA}: ${m.assunto}`, m.texto(p));
    else await enviarWhatsapp(c.celular, m.modelo, evento === "cancelado" ? p.slice(0, 4) : p);
  } catch (e) {
    console.error("Falha no aviso ao cliente", e);
  }
}
