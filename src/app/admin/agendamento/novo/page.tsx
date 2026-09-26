import Link from "next/link";
import { exigirAdmin } from "@/lib/sessao";
import { dadosDoAssistente } from "../dados";
import { NovoAgendamento } from "./novo-agendamento";

export default async function Novo() {
  await exigirAdmin();
  const dados = await dadosDoAssistente();
  return (
    <div>
      <Link href="/admin" className="text-[13px] text-graphite hover:text-signal">← Agenda</Link>
      <h1 className="mt-2 mb-8 text-[34px] font-bold leading-tight tracking-tight">Novo agendamento</h1>
      <NovoAgendamento {...dados} />
    </div>
  );
}
