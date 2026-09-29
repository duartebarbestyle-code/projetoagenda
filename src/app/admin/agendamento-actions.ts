"use server";

import { and, eq, ilike, like, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { agendamentos, clientes, servicos, user } from "@/db/schema";
import { cpfValido } from "@/lib/cpf";
import { horariosDisponiveis, servicosDisponiveis } from "@/lib/agenda";
import { dataValida, horaValida, salvarAgendamento, type DadosAgendamento } from "@/lib/agendamento";
import { exigirAdmin } from "@/lib/sessao";
import { normalizarCelular } from "@/lib/celular";
import { avisarCliente } from "@/lib/aviso-cliente";
import { avisarProfissional } from "@/lib/avisos";

export type ClienteBusca = { userId: string; nome: string; cpf: string; celular: string };

// Busca por nome completo ou CPF (com ou sem pontuação)
export async function buscarClientes(termo: string): Promise<ClienteBusca[]> {
  await exigirAdmin();
  const t = termo.trim();
  const digitos = t.replace(/\D/g, "");
  if (t.length < 2) return [];
  const nomeCompleto = sql`${clientes.nome} || ' ' || ${clientes.sobrenome}`;
  const lista = await db
    .select({ userId: clientes.userId, nome: clientes.nome, sobrenome: clientes.sobrenome, cpf: clientes.cpf, celular: clientes.celular })
    .from(clientes)
    .where(
      digitos.length >= 3 && /^[\d.\-\s]+$/.test(t)
        ? like(clientes.cpf, `${digitos}%`)
        : or(ilike(nomeCompleto, `%${t.replace(/\s+/g, "%")}%`), ilike(clientes.email, `%${t}%`)),
    )
    .orderBy(clientes.nome)
    .limit(10);
  return lista.map((c) => ({ userId: c.userId, nome: `${c.nome} ${c.sobrenome}`, cpf: c.cpf, celular: c.celular }));
}

// Cliente que chegou sem conta: cria a conta e o cadastro mínimo; avisos vão por WhatsApp.
// Quando ele criar a conta pelo e-mail com o mesmo CPF e celular, assume esta (ver cadastro/actions).
export async function cadastrarRapido(dados: {
  nomeCompleto: string;
  cpf: string;
  celular: string;
}): Promise<{ ok: true; cliente: ClienteBusca } | { ok: false; erro: string }> {
  await exigirAdmin();
  const nome = dados.nomeCompleto.trim().replace(/\s+/g, " ");
  const cpf = dados.cpf.replace(/\D/g, "");
  const celular = normalizarCelular(dados.celular);
  if (!/^\S{2,} \S+/.test(nome)) return { ok: false, erro: "Informe nome e sobrenome." };
  if (!cpfValido(cpf)) return { ok: false, erro: "CPF inválido." };
  if (!celular) return { ok: false, erro: "Celular inválido." };

  const [cpfUsado] = await db.select({ id: clientes.userId }).from(clientes).where(eq(clientes.cpf, cpf));
  if (cpfUsado) return { ok: false, erro: "Esse CPF já tem cadastro. Busque pelo CPF." };

  // Celular já usado: se a conta nunca terminou o cadastro, reaproveita; senão bloqueia
  const [dono] = await db
    .select({ id: user.id, cliente: clientes.userId })
    .from(user)
    .leftJoin(clientes, eq(clientes.userId, user.id))
    .where(eq(user.phoneNumber, celular));
  if (dono?.cliente) return { ok: false, erro: "Esse celular já é de outro cliente." };

  const userId = dono?.id ?? crypto.randomUUID();
  const [primeiro, ...resto] = nome.split(" ");
  if (!dono)
    await db.insert(user).values({
      id: userId,
      name: nome,
      email: `${cpf}@balcao.local`,
      phoneNumber: celular,
      phoneNumberVerified: false,
    });
  await db.insert(clientes).values({ userId, nome: primeiro, sobrenome: resto.join(" "), cpf, celular, aviso: "whatsapp" });
  return { ok: true, cliente: { userId, nome, cpf, celular } };
}

export async function horariosAdmin(ignorarId: number | null, profissionalId: number, data: string) {
  await exigirAdmin();
  if (!dataValida(data)) return [];
  return horariosDisponiveis(profissionalId, data, ignorarId ?? undefined);
}

export async function servicosAdmin(ignorarId: number | null, profissionalId: number, data: string, horario: string) {
  await exigirAdmin();
  if (!dataValida(data) || !horaValida(horario)) return [];
  return servicosDisponiveis(profissionalId, data, horario, ignorarId ?? undefined);
}

async function existeCliente(userId: string) {
  const [c] = await db.select({ id: clientes.userId }).from(clientes).where(eq(clientes.userId, userId));
  return Boolean(c);
}

export async function criarParaCliente(userId: string, input: DadosAgendamento) {
  await exigirAdmin();
  if (!(await existeCliente(userId))) return { ok: false as const, erro: "Cliente não encontrado." };
  const r = await salvarAgendamento({ userId, input });
  revalidatePath("/admin");
  return r;
}

export async function editarAgendamento(id: number, input: DadosAgendamento) {
  await exigirAdmin();
  const [a] = await db.select({ userId: agendamentos.userId }).from(agendamentos).where(eq(agendamentos.id, id));
  if (!a || !(await existeCliente(a.userId))) return { ok: false as const, erro: "Agendamento não encontrado." };
  const r = await salvarAgendamento({ userId: a.userId, input, editarId: id });
  revalidatePath("/admin");
  return r;
}

export async function cancelarPeloAdmin(id: number) {
  await exigirAdmin();
  const [a] = await db
    .update(agendamentos)
    .set({ status: "cancelado" })
    .where(and(eq(agendamentos.id, id), eq(agendamentos.status, "marcado")))
    .returning({
      inicio: agendamentos.inicio,
      userId: agendamentos.userId,
      servicoId: agendamentos.servicoId,
      profissionalId: agendamentos.profissionalId,
    });
  if (a) {
    await avisarProfissional("cancelado", a);
    const [s] = await db.select({ nome: servicos.nome }).from(servicos).where(eq(servicos.id, a.servicoId));
    await avisarCliente(a.userId, "cancelado", { servico: s?.nome ?? "atendimento", inicio: a.inicio });
  }
  revalidatePath("/admin");
}
