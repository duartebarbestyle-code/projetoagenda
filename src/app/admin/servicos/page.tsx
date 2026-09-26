import { exigirAdmin } from "@/lib/sessao";
import { asc, desc } from "drizzle-orm";
import { db } from "@/db";
import { servicos } from "@/db/schema";
import { alternarServico, criarServico, editarServico } from "../cadastros-actions";
import { Campo, FormAcao } from "../form-acao";
import { BotaoAtivo, Selo } from "../botao-ativo";

const reais = (c: number) => (c / 100).toFixed(2).replace(".", ",");

function CamposServico({ s }: { s?: typeof servicos.$inferSelect }) {
  return (
    <>
      <Campo rotulo="Nome" name="nome" defaultValue={s?.nome} className="min-w-48 flex-1" required />
      <Campo rotulo="Duração (min)" name="duracaoMin" type="number" min={5} max={240} step={5} defaultValue={s?.duracaoMin ?? 30} className="w-32" />
      <Campo rotulo="Preço (R$)" name="preco" inputMode="decimal" defaultValue={s ? reais(s.precoCentavos) : ""} placeholder="45,00" className="w-28" />
      <label className="flex items-center gap-2 pb-2.5 text-[13px] text-graphite">
        <input type="checkbox" name="permiteEstilo" defaultChecked={s?.permiteEstilo} className="size-4 accent-cobalt" />
        Aceita estilo
      </label>
    </>
  );
}

export default async function Servicos() {
  await exigirAdmin();
  const lista = await db.select().from(servicos).orderBy(desc(servicos.ativo), asc(servicos.id));
  return (
    <div className="space-y-8">
      <section className="card">
        <h2 className="mb-4 text-[19px] font-semibold">Novo serviço</h2>
        <FormAcao acao={criarServico} botao="Adicionar">
          <CamposServico />
        </FormAcao>
      </section>

      <section>
        <h2 className="mb-4 text-[19px] font-semibold">Serviços</h2>
        <ul className="space-y-3">
          {lista.map((s) => (
            <li key={s.id} className={`card ${s.ativo ? "" : "opacity-60"}`}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <Selo ativo={s.ativo} />
                <div className="ml-auto">
                  <BotaoAtivo ativo={s.ativo} acao={alternarServico.bind(null, s.id, !s.ativo)} />
                </div>
              </div>
              <FormAcao acao={editarServico.bind(null, s.id)} botao="Salvar">
                <CamposServico s={s} />
              </FormAcao>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
