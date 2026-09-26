import Link from "next/link";
import { and, asc, desc, eq, gt, inArray, lte, or } from "drizzle-orm";
import { db } from "@/db";
import { agendamentos, estilos, profissionais, servicos } from "@/db/schema";
import { exigirClienteComum } from "@/lib/sessao";
import { fmtData, fmtHora } from "@/lib/time";
import { cancelarAgendamento } from "../agendar/actions";

const ABAS = { agendados: "Agendados", finalizados: "Finalizados" } as const;

export default async function MeusAgendamentos({ searchParams }: PageProps<"/meus-agendamentos">) {
  const { user } = await exigirClienteComum();
  const { novo, aba: abaParam } = await searchParams;
  const aba = abaParam === "finalizados" ? "finalizados" : "agendados";
  const agora = new Date();

  // Agendados: ainda não terminaram. Finalizados: já terminaram (mais recentes primeiro).
  const lista = await db
    .select({
      id: agendamentos.id,
      inicio: agendamentos.inicio,
      servico: servicos.nome,
      profissional: profissionais.nome,
      estilo: estilos.nome,
      status: agendamentos.status,
    })
    .from(agendamentos)
    .innerJoin(servicos, eq(servicos.id, agendamentos.servicoId))
    .innerJoin(profissionais, eq(profissionais.id, agendamentos.profissionalId))
    .leftJoin(estilos, eq(estilos.id, agendamentos.estiloId))
    .where(
      and(
        eq(agendamentos.userId, user.id),
        aba === "agendados"
          ? and(eq(agendamentos.status, "marcado"), gt(agendamentos.fim, agora))
          : or(
              inArray(agendamentos.status, ["realizado", "faltou"]),
              and(eq(agendamentos.status, "marcado"), lte(agendamentos.fim, agora)),
            ),
      ),
    )
    .orderBy(aba === "agendados" ? asc(agendamentos.inicio) : desc(agendamentos.inicio))
    .limit(50);

  return (
    <div>
      <p className="eyebrow">Histórico</p>
      <h1 className="mt-2 mb-8 text-[34px] font-bold leading-tight tracking-tight">Meus horários</h1>

      {novo && aba === "agendados" && (
        <p className="mb-6 rounded-md border border-cobalt bg-cobalt/15 px-4 py-3 text-[15px]">
          Agendamento confirmado. Você vai receber um lembrete por SMS.
        </p>
      )}

      <nav className="mb-6 flex gap-6 border-b border-steel text-[15px] font-medium">
        {(Object.keys(ABAS) as (keyof typeof ABAS)[]).map((a) => (
          <Link
            key={a}
            href={a === "agendados" ? "/meus-agendamentos" : "/meus-agendamentos?aba=finalizados"}
            className={`-mb-px border-b-2 pb-3 ${
              aba === a ? "border-cobalt text-chalk" : "border-transparent text-graphite hover:text-signal"
            }`}
          >
            {ABAS[a]}
          </Link>
        ))}
      </nav>

      {lista.length === 0 ? (
        <div className="card text-graphite">
          {aba === "agendados" ? (
            <>
              Nenhum horário marcado. <Link href="/agendar" className="text-signal">Agendar agora</Link>
            </>
          ) : (
            "Nenhum atendimento finalizado ainda."
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {lista.map((a) => (
            <li key={a.id} className="card flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold">
                  {a.servico}
                  {a.estilo && ` · ${a.estilo}`}
                </div>
                <div className="text-[15px] capitalize text-graphite">
                  {fmtData(a.inicio)} às {fmtHora(a.inicio)} · {a.profissional}
                </div>
              </div>
              {aba === "agendados" ? (
                <form action={cancelarAgendamento.bind(null, a.id)}>
                  <button className="text-[13px] text-graphite hover:text-red-400">Cancelar</button>
                </form>
              ) : (
                <span className="rounded-md border border-steel px-2 py-1 text-[13px] text-graphite">
                  {a.status === "faltou" ? "Não compareceu" : "Finalizado"}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
