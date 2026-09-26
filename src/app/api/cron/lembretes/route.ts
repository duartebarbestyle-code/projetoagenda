import { and, eq, gt, isNull, lt } from "drizzle-orm";
import { db } from "@/db";
import { agendamentos, clientes, profissionais, servicos } from "@/db/schema";
import { avisarCliente } from "@/lib/aviso-cliente";
import { fmtData, fmtHora } from "@/lib/time";

// Chamado pelo Vercel Cron (vercel.json). Envia lembrete para quem tem horário
// nas próximas LEMBRETE_HORAS e ainda não foi avisado.
export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.get("authorization") !== `Bearer ${segredo}`)
    return new Response("Não autorizado", { status: 401 });

  const horas = Number(process.env.LEMBRETE_HORAS ?? 24);
  const agora = new Date();
  const limite = new Date(agora.getTime() + horas * 3_600_000);

  const pendentes = await db
    .select({
      id: agendamentos.id,
      inicio: agendamentos.inicio,
      servico: servicos.nome,
      profissional: profissionais.nome,
      nome: clientes.nome,
      userId: agendamentos.userId,
    })
    .from(agendamentos)
    .innerJoin(servicos, eq(servicos.id, agendamentos.servicoId))
    .innerJoin(profissionais, eq(profissionais.id, agendamentos.profissionalId))
    .innerJoin(clientes, eq(clientes.userId, agendamentos.userId))
    .where(
      and(
        eq(agendamentos.status, "marcado"),
        isNull(agendamentos.lembreteEnviadoEm),
        gt(agendamentos.inicio, agora),
        lt(agendamentos.inicio, limite),
      ),
    );

  let enviados = 0;
  for (const a of pendentes) {
    try {
      await avisarCliente(
        a.userId,
        "lembrete do seu horário",
        `lembrete, ${a.nome}! ${a.servico} ${fmtData(a.inicio)} às ${fmtHora(a.inicio)} com ${a.profissional}.`,
      );
      await db.update(agendamentos).set({ lembreteEnviadoEm: new Date() }).where(eq(agendamentos.id, a.id));
      enviados++;
    } catch (e) {
      console.error(`Falha no lembrete ${a.id}`, e);
    }
  }

  return Response.json({ pendentes: pendentes.length, enviados });
}
