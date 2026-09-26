import { exigirAdmin } from "@/lib/sessao";
import { asc, desc } from "drizzle-orm";
import { db } from "@/db";
import { profissionais } from "@/db/schema";
import { alternarProfissional, criarProfissional, editarProfissional } from "../cadastros-actions";
import { Campo, FormAcao } from "../form-acao";
import { BotaoAtivo, Selo } from "../botao-ativo";

export default async function Profissionais() {
  await exigirAdmin();
  const lista = await db.select().from(profissionais).orderBy(desc(profissionais.ativo), asc(profissionais.id));
  return (
    <div className="space-y-8">
      <section className="card">
        <h2 className="mb-4 text-[19px] font-semibold">Novo profissional</h2>
        <FormAcao acao={criarProfissional} botao="Adicionar">
          <Campo rotulo="Nome" name="nome" className="min-w-48 flex-1" required />
          <Campo rotulo="WhatsApp" name="telefone" telefone className="w-48" />
        </FormAcao>
      </section>

      <section>
        <h2 className="mb-1 text-[19px] font-semibold">Profissionais</h2>
        <p className="mb-4 text-[13px] text-graphite">
          Inativos não aparecem para o cliente. Horários já marcados continuam. Com WhatsApp preenchido, o barbeiro
          recebe a agenda do dia às 7h30 e um aviso a cada agendamento novo, alterado ou cancelado.
        </p>
        <ul className="space-y-3">
          {lista.map((p) => (
            <li key={p.id} className={`card flex flex-wrap items-end gap-3 ${p.ativo ? "" : "opacity-60"}`}>
              <FormAcao acao={editarProfissional.bind(null, p.id)} botao="Salvar" className="flex-1">
                <Campo rotulo="Nome" name="nome" defaultValue={p.nome} className="min-w-48 flex-1" required />
                <Campo rotulo="WhatsApp" name="telefone" telefone defaultValue={p.telefone ?? ""} className="w-48" />
              </FormAcao>
              <Selo ativo={p.ativo} />
              <BotaoAtivo ativo={p.ativo} acao={alternarProfissional.bind(null, p.id, !p.ativo)} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
