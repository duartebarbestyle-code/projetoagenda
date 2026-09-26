import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { agendamentos, clientes, profissionais } from "@/db/schema";
import { exigirAdmin } from "@/lib/sessao";
import { dataLocal, fmtHora } from "@/lib/time";
import { mascaraCelular, mascaraCpf } from "@/lib/mascaras";
import { dadosDoAssistente } from "../dados";
import { EditarAgendamento } from "./editar-agendamento";

export default async function Editar({ params }: PageProps<"/admin/agendamento/[id]">) {
  await exigirAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const [a] = await db
    .select({
      id: agendamentos.id,
      inicio: agendamentos.inicio,
      servicoId: agendamentos.servicoId,
      estiloId: agendamentos.estiloId,
      observacao: agendamentos.observacao,
      profissionalId: profissionais.id,
      profissional: profissionais.nome,
      nome: clientes.nome,
      sobrenome: clientes.sobrenome,
      cpf: clientes.cpf,
      celular: clientes.celular,
    })
    .from(agendamentos)
    .innerJoin(profissionais, eq(profissionais.id, agendamentos.profissionalId))
    .innerJoin(clientes, eq(clientes.userId, agendamentos.userId))
    .where(and(eq(agendamentos.id, id), eq(agendamentos.status, "marcado")));
  if (!a) notFound();

  const data = dataLocal(a.inicio);
  const dados = await dadosDoAssistente(data);

  return (
    <div>
      <Link href={`/admin?dia=${data}`} className="text-[13px] text-graphite hover:text-signal">← Agenda</Link>
      <h1 className="mt-2 mb-8 text-[34px] font-bold leading-tight tracking-tight">Editar agendamento</h1>
      <div className="card mb-8">
        <p className="eyebrow">Cliente</p>
        <div className="font-semibold">
          {a.nome} {a.sobrenome}
        </div>
        <div className="text-[13px] text-graphite">
          CPF {mascaraCpf(a.cpf)} · {mascaraCelular(a.celular)}
        </div>
      </div>
      <EditarAgendamento
        id={a.id}
        {...dados}
        inicial={{
          servicoId: a.servicoId,
          data,
          horario: fmtHora(a.inicio),
          profissional: { id: a.profissionalId, nome: a.profissional },
          estiloId: a.estiloId,
          observacao: a.observacao ?? "",
        }}
      />
    </div>
  );
}
