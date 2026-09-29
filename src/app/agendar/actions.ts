"use server";

import { and, eq, gt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { agendamentos } from "@/db/schema";
import { horariosDisponiveis, servicosDisponiveis } from "@/lib/agenda";
import { dataValida, horaValida, salvarAgendamento, type DadosAgendamento } from "@/lib/agendamento";
import { exigirCliente } from "@/lib/sessao";
import { avisarProfissional } from "@/lib/avisos";

export async function carregarHorarios(profissionalId: number, dataISO: string) {
  await exigirCliente();
  if (!dataValida(dataISO)) return [];
  return horariosDisponiveis(profissionalId, dataISO);
}

export async function carregarServicos(profissionalId: number, dataISO: string, horario: string) {
  await exigirCliente();
  if (!dataValida(dataISO) || !horaValida(horario)) return [];
  return servicosDisponiveis(profissionalId, dataISO, horario);
}

export async function confirmarAgendamento(input: DadosAgendamento) {
  const { user } = await exigirCliente();
  const r = await salvarAgendamento({ userId: user.id, input });
  if (!r.ok && r.erro.startsWith("O cliente")) return { ok: false as const, erro: "Você já tem um horário marcado nesse período." };
  revalidatePath("/meus-agendamentos");
  return r;
}

export async function cancelarAgendamento(id: number) {
  const { user } = await exigirCliente();
  const [a] = await db
    .update(agendamentos)
    .set({ status: "cancelado" })
    .where(
      and(
        eq(agendamentos.id, id),
        eq(agendamentos.userId, user.id),
        eq(agendamentos.status, "marcado"),
        gt(agendamentos.inicio, new Date()),
      ),
    )
    .returning({
      inicio: agendamentos.inicio,
      userId: agendamentos.userId,
      servicoId: agendamentos.servicoId,
      profissionalId: agendamentos.profissionalId,
    });
  if (a) await avisarProfissional("cancelado", a);
  revalidatePath("/meus-agendamentos");
}
