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
  marcados: Marcado[],
  profissionalId: number,
  inicio: Date,
  fim: Date,
) {
  return !marcados.some((a) => a.profissionalId === profissionalId && a.inicio < fim && a.fim > inicio);
}

type Marcado = { profissionalId: number; inicio: Date; fim: Date };

// Um serviço de duracaoMin cabe se começa num horário da grade, no futuro, dentro do expediente e com o profissional livre
function cabe(
  marcados: Marcado[],
  profissionalId: number,
  dataISO: string,
  horario: string,
  duracaoMin: number,
  exp: { abre: string; fecha: string },
) {
  const m = minutos(horario);
  const abre = minutos(exp.abre);
  if (m < abre || m + duracaoMin > minutos(exp.fecha) || (m - abre) % INTERVALO_SLOT_MIN !== 0) return false;
  const inicio = paraDate(dataISO, horario);
  if (inicio <= new Date()) return false;
  return livre(marcados, profissionalId, inicio, new Date(inicio.getTime() + duracaoMin * 60_000));
}

async function servicosAtivos() {
  return db.select().from(servicos).where(eq(servicos.ativo, true));
}

// Horários do dia em que o profissional tem livre ao menos o serviço mais curto. Horários passados não aparecem.
export async function horariosDisponiveis(profissionalId: number, dataISO: string, ignorarId?: number) {
  const exp = EXPEDIENTE[diaDaSemana(dataISO)];
  const lista = await servicosAtivos();
  if (!exp || !lista.length) return [];

  const { pros, marcados } = await ocupacaoDoDia(dataISO, ignorarId);
  if (!pros.some((p) => p.id === profissionalId)) return [];
  const menor = Math.min(...lista.map((s) => s.duracaoMin));

  const horarios: string[] = [];
  for (let m = minutos(exp.abre); m + menor <= minutos(exp.fecha); m += INTERVALO_SLOT_MIN) {
    if (cabe(marcados, profissionalId, dataISO, hm(m), menor, exp)) horarios.push(hm(m));
  }
  return horarios;
}

// Ids dos serviços que cabem a partir do horário escolhido com esse profissional
export async function servicosDisponiveis(profissionalId: number, dataISO: string, horario: string, ignorarId?: number) {
  const exp = EXPEDIENTE[diaDaSemana(dataISO)];
  if (!exp) return [];
  const [lista, { pros, marcados }] = await Promise.all([servicosAtivos(), ocupacaoDoDia(dataISO, ignorarId)]);
  if (!pros.some((p) => p.id === profissionalId)) return [];
  return lista.filter((s) => cabe(marcados, profissionalId, dataISO, horario, s.duracaoMin, exp)).map((s) => s.id);
}

// Profissional, se ele puder fazer esse serviço nesse horário
export async function profissionalDisponivel(
  servicoId: number,
  profissionalId: number,
  dataISO: string,
  horario: string,
  ignorarId?: number,
) {
  const servico = await buscarServico(servicoId);
  const exp = EXPEDIENTE[diaDaSemana(dataISO)];
  if (!servico || !exp) return null;
  const { pros, marcados } = await ocupacaoDoDia(dataISO, ignorarId);
  const pro = pros.find((p) => p.id === profissionalId);
  if (!pro || !cabe(marcados, pro.id, dataISO, horario, servico.duracaoMin, exp)) return null;
  return { id: pro.id, nome: pro.nome };
}
