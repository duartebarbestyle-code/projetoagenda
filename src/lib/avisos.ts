import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clientes, profissionais, servicos } from "@/db/schema";
import { fmtData, fmtHora } from "./time";
import { enviarWhatsapp } from "./whatsapp";

export type Tipo = "novo" | "cancelado" | "alterado" | "saiu";

const TITULO: Record<Tipo, string> = {
  novo: "novo agendamento",
  cancelado: "agendamento cancelado",
  alterado: "agendamento alterado",
  saiu: "saiu da sua agenda",
};

// Avisa o barbeiro no WhatsApp (modelo aviso_barbeiro). Falha no envio nunca impede o agendamento.
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
    await enviarWhatsapp(pro.telefone, "aviso_barbeiro", [
      antes ? `${TITULO[tipo]} (antes: ${fmtData(antes)} às ${fmtHora(antes)})` : TITULO[tipo],
      serv?.nome ?? "Atendimento",
      fmtData(a.inicio),
      fmtHora(a.inicio),
      cli ? `${cli.nome} ${cli.sobrenome}` : "-",
    ]);
  } catch (e) {
    console.error("Falha no aviso ao profissional", e);
  }
}
