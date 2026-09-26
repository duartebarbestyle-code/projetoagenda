import Link from "next/link";
import { fmtHora, fmtPreco } from "@/lib/time";
import { BotaoCancelar } from "./botao-cancelar";
import { adicionarExtra, marcarStatus, removerExtra } from "./actions";

export type ItemAgenda = {
  id: number;
  inicio: Date;
  fim: Date;
  servico: string;
  preco: number;
  cliente: string;
  sobrenome: string;
  celular: string;
  estilo: string | null;
  observacao: string | null;
};
type Extra = { id: number; nome: string; preco: number };

export function AgendaCard({
  a,
  extras: meus,
  servicos: todosServicos,
  agora,
}: {
  a: ItemAgenda;
  extras: Extra[];
  servicos: { id: number; nome: string; precoCentavos: number }[];
  agora: Date;
}) {
  const total = a.preco + meus.reduce((s, e) => s + e.preco, 0);
  const comecou = a.inicio <= agora;
  const aguardando = a.fim <= agora;
  return (
    <li className="card space-y-4">
      <div className="flex items-start gap-5">
        <div className="w-20 text-[19px] font-semibold">
          {fmtHora(a.inicio)}
          <div className="text-[13px] font-normal text-ash">até {fmtHora(a.fim)}</div>
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 font-semibold">
            {a.cliente} {a.sobrenome}
            {aguardando && (
              <span className="rounded-md border border-cobalt bg-cobalt/15 px-2 py-0.5 text-[13px] font-medium">
                Aguardando confirmação
              </span>
            )}
          </div>
          <div className="text-[15px] text-graphite">
            {a.servico}
            {a.estilo && ` (${a.estilo})`} · {a.celular}
          </div>
          {a.observacao && <div className="mt-1 text-[13px] text-fog">“{a.observacao}”</div>}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="font-semibold">{fmtPreco(total)}</div>
          <div className="flex gap-3 text-[13px]">
            <Link href={`/admin/agendamento/${a.id}`} className="text-graphite hover:text-signal">Editar</Link>
            <BotaoCancelar id={a.id} />
          </div>
        </div>
      </div>

      {meus.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {meus.map((e) => (
            <li key={e.id} className="flex items-center gap-2 rounded-md border border-steel bg-obsidian px-2 py-1 text-[13px]">
              + {e.nome} · {fmtPreco(e.preco)}
              <form action={removerExtra.bind(null, a.id, e.id)}>
                <button className="text-ash hover:text-red-400" aria-label={`Remover ${e.nome}`}>×</button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-steel pt-4">
        <form action={adicionarExtra.bind(null, a.id)} className="flex gap-2">
          <select name="servicoId" className="input w-auto py-2 text-[13px]" defaultValue="">
            <option value="" disabled>Adicionar serviço</option>
            {todosServicos.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome} · {fmtPreco(s.precoCentavos)}
              </option>
            ))}
          </select>
          <button className="btn-ghost px-3 py-2 text-[13px]">Adicionar</button>
        </form>
        {comecou && (
          <div className="ml-auto flex gap-2">
            <form action={marcarStatus.bind(null, a.id, "faltou")}>
              <button className="btn-ghost px-3 py-2 text-[13px] hover:border-red-400 hover:text-red-400">Não compareceu</button>
            </form>
            <form action={marcarStatus.bind(null, a.id, "realizado")}>
              <button className="btn-primary px-3 py-2 text-[13px]">Realizado</button>
            </form>
          </div>
        )}
      </div>
    </li>
  );
}
