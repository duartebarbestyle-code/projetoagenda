import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clientes, profissionais, servicos } from "@/db/schema";
import { fmtData, fmtHora } from "./time";
import { enviarWhatsapp } from "./whatsapp";

export type Tipo = "novo" | "cancelado" | "alterado" | "saiu";

const TITULO: Record<Tipo, string> = {
  novo: "📅 Novo agendamento",
  cancelado: "❌ Agendamento cancelado",
  alterado: "✏️ Agendamento alterado",
  saiu: "↪️ Saiu da sua agenda",
};

// Avisa o barbeiro no WhatsApp. Falha no envio nunca impede o agendamento.
export async function avisarProfissional(
  tipo: Tipo,
  a: { profissionalId: number; servicoId: number; userId: string; inicio: Date },
  antes?: Date,
) {
  try {
    const [[pro], [serv], [cli]] = await Promise.all([
      db.select().from(profissionais).where(eq(profissionais.id, a.profissionalId)),
      db.select({ nome: servicos.nome }).from(servicos).where(eq(servicos.id, a.servicoId)),
      db.select({ nome: clientes.nome, sobrenome: clientes.sobrenome }).from(clientes).where(eq(clientes.userId, a.userId)),
    ]);
    if (!pro?.telefone) return;
    const linhas = [
      TITULO[tipo],
      `${serv?.nome ?? "Atendimento"} · ${fmtData(a.inicio)} às ${fmtHora(a.inicio)}`,
      `Cliente: ${cli ? `${cli.nome} ${cli.sobrenome}` : "—"}`,
    ];
    if (antes) linhas.push(`Antes: ${fmtData(antes)} às ${fmtHora(antes)}`);
    await enviarWhatsapp(pro.telefone, linhas.join("\n"));
  } catch (e) {
    console.error("Falha no aviso ao profissional", e);
  }
}
