import { and, eq, gt, lt, ne } from "drizzle-orm";
import { db } from "@/db";
import { agendamentos, estilos } from "@/db/schema";
import { buscarServico, profissionalDisponivel } from "./agenda";
import { avisarProfissional } from "./avisos";
import { avisarCliente } from "./aviso-cliente";
import { paraDate } from "./time";

export type DadosAgendamento = {
  servicoId: number;
  data: string;
  horario: string;
  profissionalId: number;
  estiloId?: number | null;
  observacao?: string;
};
export type Resultado = { ok: true } | { ok: false; erro: string };

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^\d{2}:\d{2}$/;
export const dataValida = (d: string) => DATA.test(d);
export const horaValida = (h: string) => HORA.test(h);

// Cria (ou, com editarId, altera) um agendamento validando disponibilidade. Avisa o cliente por e-mail ou WhatsApp.
export async function salvarAgendamento(opts: {
  userId: string;
  input: DadosAgendamento;
  editarId?: number;
}): Promise<Resultado> {
  const { userId, input, editarId } = opts;
  const servico = await buscarServico(input.servicoId);
  if (!servico || !DATA.test(input.data) || !HORA.test(input.horario)) return { ok: false, erro: "Dados inválidos." };

  const pro = await profissionalDisponivel(input.servicoId, input.profissionalId, input.data, input.horario, editarId);
  if (!pro) return { ok: false, erro: "Esse horário não está mais disponível." };

  let estiloId: number | null = null;
  if (servico.permiteEstilo && input.estiloId) {
    const [e] = await db.select().from(estilos).where(and(eq(estilos.id, input.estiloId), eq(estilos.ativo, true)));
    if (!e) return { ok: false, erro: "Estilo indisponível." };
    estiloId = e.id;
  }
  const observacao = servico.permiteEstilo ? input.observacao?.trim().slice(0, 500) || null : null;

  const inicio = paraDate(input.data, input.horario);
  const fim = new Date(inicio.getTime() + servico.duracaoMin * 60_000);

  // O cliente não pode ter dois horários ao mesmo tempo
  const [choque] = await db
    .select({ id: agendamentos.id })
    .from(agendamentos)
    .where(
      and(
        eq(agendamentos.userId, userId),
        ne(agendamentos.status, "cancelado"),
        lt(agendamentos.inicio, fim),
        gt(agendamentos.fim, inicio),
        editarId ? ne(agendamentos.id, editarId) : undefined,
      ),
    );
  if (choque) return { ok: false, erro: "O cliente já tem um horário marcado nesse período." };

  const valores = { servicoId: servico.id, profissionalId: pro.id, inicio, fim, estiloId, observacao };
  const [anterior] = editarId
    ? await db
        .select({ profissionalId: agendamentos.profissionalId, servicoId: agendamentos.servicoId, inicio: agendamentos.inicio })
        .from(agendamentos)
        .where(eq(agendamentos.id, editarId))
    : [];
  try {
    if (editarId) {
      const alterados = await db
        .update(agendamentos)
        .set({ ...valores, lembreteEnviadoEm: null })
        .where(and(eq(agendamentos.id, editarId), eq(agendamentos.status, "marcado")))
        .returning({ id: agendamentos.id });
      if (!alterados.length) return { ok: false, erro: "Agendamento não pode mais ser alterado." };
    } else {
      await db.insert(agendamentos).values({ userId, ...valores });
    }
  } catch (e) {
    // 23P01 = conflito na constraint de exclusão (horário tomado ao mesmo tempo)
    const err = e as { code?: string; cause?: { code?: string } };
    if (err.code === "23P01" || err.cause?.code === "23P01")
      return { ok: false, erro: "Esse horário acabou de ser ocupado." };
    throw e;
  }

  // Avisos ao barbeiro (WhatsApp)
  const agora = { ...valores, userId };
  if (!anterior) await avisarProfissional("novo", agora);
  else if (anterior.profissionalId !== pro.id) {
    await avisarProfissional("saiu", { ...anterior, userId });
    await avisarProfissional("novo", agora);
  } else await avisarProfissional("alterado", agora, anterior.inicio.getTime() !== inicio.getTime() ? anterior.inicio : undefined);

  await avisarCliente(userId, editarId ? "alterado" : "confirmado", { servico: servico.nome, inicio, profissional: pro.nome });
  return { ok: true };
}
