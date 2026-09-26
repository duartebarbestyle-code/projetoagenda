import { and, asc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { agendamentoExtras, agendamentos, clientes, estilos, profissionais, servicos } from "@/db/schema";
import { EXPEDIENTE, FUSO, INTERVALO_SLOT_MIN } from "@/lib/config";
import { exigirAdmin } from "@/lib/sessao";
import { dataLocal, fmtHora, hm, minutos, paraDate, somarDias } from "@/lib/time";
import { AutoRefresh } from "@/components/auto-refresh";
import { AgendaCard } from "./agenda-card";
import { FiltrosAgenda } from "./filtros-agenda";

const HORA = /^\d{2}:\d{2}$/;

// Todos os horários possíveis do expediente, para o filtro
const expedientes = Object.values(EXPEDIENTE).filter((e) => e !== null);
const abre = Math.min(...expedientes.map((e) => minutos(e.abre)));
const fecha = Math.max(...expedientes.map((e) => minutos(e.fecha)));
const HORARIOS = Array.from({ length: (fecha - abre) / INTERVALO_SLOT_MIN }, (_, i) => hm(abre + i * INTERVALO_SLOT_MIN));

// Agenda do barbeiro: um bloco por profissional. Realizado/faltou saem da lista.
export default async function Admin({ searchParams }: PageProps<"/admin">) {
  await exigirAdmin();
  const q = await searchParams;
  const hoje = dataLocal();
  const data = typeof q.dia === "string" && /^\d{4}-\d{2}-\d{2}$/.test(q.dia) ? q.dia : hoje;
  const servicoId = Number(q.servico) || null;
  const de = typeof q.de === "string" && HORA.test(q.de) ? q.de : null;
  const ate = typeof q.ate === "string" && HORA.test(q.ate) ? q.ate : null;
  const agora = new Date();

  // Dias com agendamento (bolinha no calendário): mês anterior até o seguinte
  const [a, m] = data.split("-").map(Number);
  const iniMeses = paraDate(`${a}-${String(m).padStart(2, "0")}-01`, "00:00");
  iniMeses.setUTCMonth(iniMeses.getUTCMonth() - 1);
  const fimMeses = new Date(iniMeses);
  fimMeses.setUTCMonth(fimMeses.getUTCMonth() + 3);
  const diaLocal = sql<string>`to_char(${agendamentos.inicio} AT TIME ZONE ${FUSO}, 'YYYY-MM-DD')`;

  const [lista, todosServicos, pros, dias] = await Promise.all([
    db
      .select({
        id: agendamentos.id,
        inicio: agendamentos.inicio,
        fim: agendamentos.fim,
        servico: servicos.nome,
        preco: servicos.precoCentavos,
        profissionalId: agendamentos.profissionalId,
        cliente: clientes.nome,
        sobrenome: clientes.sobrenome,
        celular: clientes.celular,
        estilo: estilos.nome,
        observacao: agendamentos.observacao,
      })
      .from(agendamentos)
      .innerJoin(servicos, eq(servicos.id, agendamentos.servicoId))
      .innerJoin(clientes, eq(clientes.userId, agendamentos.userId))
      .leftJoin(estilos, eq(estilos.id, agendamentos.estiloId))
      .where(
        and(
          eq(agendamentos.status, "marcado"),
          gte(agendamentos.inicio, paraDate(data, "00:00")),
          lt(agendamentos.inicio, paraDate(somarDias(data, 1), "00:00")),
          servicoId ? eq(agendamentos.servicoId, servicoId) : undefined,
        ),
      )
      .orderBy(asc(agendamentos.inicio)),
    db.select().from(servicos).where(eq(servicos.ativo, true)).orderBy(servicos.id),
    db.select().from(profissionais).orderBy(asc(profissionais.id)),
    db
      .selectDistinct({ dia: diaLocal })
      .from(agendamentos)
      .where(and(eq(agendamentos.status, "marcado"), gte(agendamentos.inicio, iniMeses), lt(agendamentos.inicio, fimMeses))),
  ]);

  const filtrada = lista.filter((x) => {
    const h = fmtHora(x.inicio);
    return (!de || h >= de) && (!ate || h <= ate);
  });

  const extras = filtrada.length
    ? await db
        .select({
          id: agendamentoExtras.id,
          agendamentoId: agendamentoExtras.agendamentoId,
          nome: servicos.nome,
          preco: agendamentoExtras.precoCentavos,
        })
        .from(agendamentoExtras)
        .innerJoin(servicos, eq(servicos.id, agendamentoExtras.servicoId))
        .where(inArray(agendamentoExtras.agendamentoId, filtrada.map((x) => x.id)))
        .orderBy(asc(agendamentoExtras.id))
    : [];

  // Ativos sempre aparecem; inativos só se tiverem horário no dia
  const blocos = pros
    .map((p) => ({ ...p, itens: filtrada.filter((x) => x.profissionalId === p.id) }))
    .filter((p) => p.ativo || p.itens.length > 0);
  const filtrando = Boolean(servicoId || de || ate);

  return (
    <div>
      <AutoRefresh />
      <p className="eyebrow">Painel</p>
      <div className="mt-2 mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[34px] font-bold leading-tight tracking-tight">Agenda do dia</h1>
        <Link href="/admin/agendamento/novo" className="btn-primary">+ Novo agendamento</Link>
      </div>

      <FiltrosAgenda
        dia={data}
        hoje={hoje}
        diasComAgenda={dias.map((d) => d.dia)}
        servicos={todosServicos.map(({ id, nome }) => ({ id, nome }))}
        horarios={HORARIOS}
      />

      <div className="space-y-10">
        {blocos.map((p) => (
          <section key={p.id}>
            <h2 className="mb-4 flex items-center gap-3 text-[19px] font-semibold">
              {p.nome}
              <span className="text-[13px] font-normal text-graphite">
                {p.itens.length} {p.itens.length === 1 ? "agendamento" : "agendamentos"}
              </span>
            </h2>
            {p.itens.length === 0 ? (
              <div className="card text-[15px] text-graphite">
                {filtrando ? "Nenhum agendamento com esses filtros." : "Sem agendamentos pendentes."}
              </div>
            ) : (
              <ul className="space-y-3">
                {p.itens.map((x) => (
                  <AgendaCard
                    key={x.id}
                    a={x}
                    extras={extras.filter((e) => e.agendamentoId === x.id)}
                    servicos={todosServicos}
                    agora={agora}
                  />
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
