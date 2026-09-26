import { and, eq, gt, lt, ne } from "drizzle-orm";
import { db } from "@/db";
import { agendamentos, profissionais, servicos } from "@/db/schema";
import { EXPEDIENTE, INTERVALO_SLOT_MIN } from "./config";
import { diaDaSemana, hm, minutos, paraDate } from "./time";

export async function buscarServico(id: number) {
  const [s] = await db.select().from(servicos).where(and(eq(servicos.id, id), eq(servicos.ativo, true)));
  return s ?? null;
}

// ignorarId: o próprio agendamento, ao editar
async function ocupacaoDoDia(dataISO: string, ignorarId?: number) {
  const inicioDia = paraDate(dataISO, "00:00");
  const fimDia = paraDate(dataISO, "23:59");
  const [pros, marcados] = await Promise.all([
    db.select().from(profissionais).where(eq(profissionais.ativo, true)),
    db
      .select({ profissionalId: agendamentos.profissionalId, inicio: agendamentos.inicio, fim: agendamentos.fim })
      .from(agendamentos)
      .where(
        and(
          ne(agendamentos.status, "cancelado"),
          lt(agendamentos.inicio, fimDia),
          gt(agendamentos.fim, inicioDia),
          ignorarId ? ne(agendamentos.id, ignorarId) : undefined,
        ),
      ),
  ]);
  return { pros, marcados };
}

function livre(
  marcados: { profissionalId: number; inicio: Date; fim: Date }[],
  profissionalId: number,
  inicio: Date,
  fim: Date,
) {
  return !marcados.some((a) => a.profissionalId === profissionalId && a.inicio < fim && a.fim > inicio);
}

// Horários do dia com pelo menos um profissional livre. Horários passados não aparecem.
export async function horariosDisponiveis(servicoId: number, dataISO: string, ignorarId?: number) {
  const servico = await buscarServico(servicoId);
  const exp = EXPEDIENTE[diaDaSemana(dataISO)];
  if (!servico || !exp) return [];

  const { pros, marcados } = await ocupacaoDoDia(dataISO, ignorarId);
  const agora = new Date();
  const horarios: string[] = [];

  for (let m = minutos(exp.abre); m + servico.duracaoMin <= minutos(exp.fecha); m += INTERVALO_SLOT_MIN) {
    const inicio = paraDate(dataISO, hm(m));
    if (inicio <= agora) continue;
    const fim = new Date(inicio.getTime() + servico.duracaoMin * 60_000);
    if (pros.some((p) => livre(marcados, p.id, inicio, fim))) horarios.push(hm(m));
  }
  return horarios;
}

export async function profissionaisDisponiveis(servicoId: number, dataISO: string, horario: string, ignorarId?: number) {
  const servico = await buscarServico(servicoId);
  if (!servico || !(await horariosDisponiveis(servicoId, dataISO, ignorarId)).includes(horario)) return [];

  const { pros, marcados } = await ocupacaoDoDia(dataISO, ignorarId);
  const inicio = paraDate(dataISO, horario);
  const fim = new Date(inicio.getTime() + servico.duracaoMin * 60_000);
  return pros.filter((p) => livre(marcados, p.id, inicio, fim)).map((p) => ({ id: p.id, nome: p.nome }));
}
