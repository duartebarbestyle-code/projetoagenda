import { and, asc, eq, gte, isNotNull, lt } from "drizzle-orm";
import { db } from "@/db";
import { agendamentos, clientes, profissionais, servicos } from "@/db/schema";
import { dataLocal, fmtData, fmtHora, paraDate, somarDias } from "@/lib/time";
import { enviarWhatsapp } from "@/lib/whatsapp";

// Vercel Cron (vercel.json), de manhã: manda a agenda do dia para cada barbeiro com WhatsApp
export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.get("authorization") !== `Bearer ${segredo}`)
    return new Response("Não autorizado", { status: 401 });

  const hoje = dataLocal();
  const [pros, lista] = await Promise.all([
    db
      .select()
      .from(profissionais)
      .where(and(eq(profissionais.ativo, true), isNotNull(profissionais.telefone))),
    db
      .select({
        profissionalId: agendamentos.profissionalId,
        inicio: agendamentos.inicio,
        servico: servicos.nome,
        nome: clientes.nome,
        sobrenome: clientes.sobrenome,
      })
      .from(agendamentos)
      .innerJoin(servicos, eq(servicos.id, agendamentos.servicoId))
      .innerJoin(clientes, eq(clientes.userId, agendamentos.userId))
      .where(
        and(
          eq(agendamentos.status, "marcado"),
          gte(agendamentos.inicio, paraDate(hoje, "00:00")),
          lt(agendamentos.inicio, paraDate(somarDias(hoje, 1), "00:00")),
        ),
      )
      .orderBy(asc(agendamentos.inicio)),
  ]);

  let enviados = 0;
  for (const p of pros) {
    const meus = lista.filter((a) => a.profissionalId === p.id);
    const titulo = `☀️ Bom dia, ${p.nome}! Agenda de ${fmtData(paraDate(hoje, "12:00"))}`;
    const corpo = meus.length
      ? meus.map((a) => `${fmtHora(a.inicio)} · ${a.servico} · ${a.nome} ${a.sobrenome}`).join("\n")
      : "Nenhum agendamento por enquanto.";
    try {
      await enviarWhatsapp(p.telefone!, `${titulo}\n\n${corpo}\n\nTotal: ${meus.length}`);
      enviados++;
    } catch (e) {
      console.error(`Falha na agenda do profissional ${p.id}`, e);
    }
  }
  return Response.json({ profissionais: pros.length, enviados });
}
