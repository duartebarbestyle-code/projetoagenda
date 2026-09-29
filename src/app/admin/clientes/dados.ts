import { and, asc, eq, ilike, like, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { agendamentos, clientes } from "@/db/schema";

const data = (v: unknown) => (v ? new Date(v as string) : null);

// Atendimentos por cliente: realizados, faltas, último realizado e próximo marcado
const historicoPorCliente = () =>
  db
    .select({
      userId: agendamentos.userId,
      realizados: sql<number>`count(*) filter (where ${agendamentos.status} = 'realizado')`.mapWith(Number).as("realizados"),
      faltas: sql<number>`count(*) filter (where ${agendamentos.status} = 'faltou')`.mapWith(Number).as("faltas"),
      ultimo: sql<Date | null>`max(${agendamentos.inicio}) filter (where ${agendamentos.status} = 'realizado')`
        .mapWith(data)
        .as("ultimo"),
      proximo: sql<Date | null>`min(${agendamentos.inicio}) filter (where ${agendamentos.status} = 'marcado' and ${agendamentos.inicio} > now())`
        .mapWith(data)
        .as("proximo"),
    })
    .from(agendamentos)
    .groupBy(agendamentos.userId)
    .as("historico");

// Clientes (sem a conta de admin), com busca por nome, e-mail ou CPF. Usado na tela e na exportação.
export async function listarClientes(busca = "") {
  const historico = historicoPorCliente();
  const t = busca.trim();
  const digitos = t.replace(/\D/g, "");
  const nomeCompleto = sql`${clientes.nome} || ' ' || ${clientes.sobrenome}`;
  const filtro =
    t.length < 2
      ? undefined
      : digitos.length >= 3 && /^[\d.\-\s]+$/.test(t)
        ? like(clientes.cpf, `${digitos}%`)
        : or(ilike(nomeCompleto, `%${t.replace(/\s+/g, "%")}%`), ilike(clientes.email, `%${t}%`));

  const lista = await db
    .select({
      userId: clientes.userId,
      nome: clientes.nome,
      sobrenome: clientes.sobrenome,
      email: clientes.email,
      cpf: clientes.cpf,
      celular: clientes.celular,
      cep: clientes.cep,
      rua: clientes.rua,
      numero: clientes.numero,
      complemento: clientes.complemento,
      bairro: clientes.bairro,
      cidade: clientes.cidade,
      uf: clientes.uf,
      aviso: clientes.aviso,
      cadastro: clientes.createdAt,
      realizados: historico.realizados,
      faltas: historico.faltas,
      ultimo: historico.ultimo,
      proximo: historico.proximo,
    })
    .from(clientes)
    .leftJoin(historico, eq(historico.userId, clientes.userId))
    .where(and(eq(clientes.tipo, "cliente"), filtro))
    .orderBy(asc(clientes.nome), asc(clientes.sobrenome));

  return lista.map((c) => ({ ...c, realizados: c.realizados ?? 0, faltas: c.faltas ?? 0 }));
}

export type ClienteLista = Awaited<ReturnType<typeof listarClientes>>[number];
