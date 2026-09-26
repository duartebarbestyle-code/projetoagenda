"use server";

import { and, eq, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { agendamentoExtras, agendamentos } from "@/db/schema";
import { buscarServico } from "@/lib/agenda";
import { exigirAdmin } from "@/lib/sessao";

async function marcado(id: number) {
  const [a] = await db
    .select({ id: agendamentos.id })
    .from(agendamentos)
    .where(and(eq(agendamentos.id, id), eq(agendamentos.status, "marcado")));
  return a ?? null;
}

// Realizado ou faltou, só depois que o horário começou
export async function marcarStatus(id: number, status: "realizado" | "faltou") {
  await exigirAdmin();
  await db
    .update(agendamentos)
    .set({ status })
    .where(and(eq(agendamentos.id, id), eq(agendamentos.status, "marcado"), lte(agendamentos.inicio, new Date())));
  revalidatePath("/admin");
}

export async function adicionarExtra(id: number, form: FormData) {
  await exigirAdmin();
  const servico = await buscarServico(Number(form.get("servicoId")));
  if (!servico || !(await marcado(id))) return;
  await db.insert(agendamentoExtras).values({ agendamentoId: id, servicoId: servico.id, precoCentavos: servico.precoCentavos });
  revalidatePath("/admin");
}

export async function removerExtra(agendamentoId: number, extraId: number) {
  await exigirAdmin();
  if (!(await marcado(agendamentoId))) return;
  await db
    .delete(agendamentoExtras)
    .where(and(eq(agendamentoExtras.id, extraId), eq(agendamentoExtras.agendamentoId, agendamentoId)));
  revalidatePath("/admin");
}
