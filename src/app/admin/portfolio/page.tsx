import { exigirAdmin } from "@/lib/sessao";
import { asc, desc } from "drizzle-orm";
import { db } from "@/db";
import { estilos } from "@/db/schema";
import { EstiloImagem } from "@/components/estilo-card";
import { alternarEstilo, criarEstilo, editarEstilo } from "../cadastros-actions";
import { EstiloForm } from "./estilo-form";
import { BotaoAtivo, Selo } from "../botao-ativo";

export default async function PortfolioAdmin() {
  await exigirAdmin();
  const blob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  const lista = await db.select().from(estilos).orderBy(desc(estilos.ativo), asc(estilos.id));
  return (
    <div className="space-y-8">
      <section className="card">
        <h2 className="mb-4 text-[19px] font-semibold">Novo estilo</h2>
        <EstiloForm acao={criarEstilo} botao="Adicionar" blob={blob} />
      </section>

      <section>
        <h2 className="mb-1 text-[19px] font-semibold">Estilos</h2>
        <p className="mb-4 text-[13px] text-graphite">Aparecem no Portfólio e na escolha de estilo dos cortes.</p>
        <ul className="grid gap-4 sm:grid-cols-2">
          {lista.map((e) => (
            <li key={e.id} className={`card space-y-3 p-4 ${e.ativo ? "" : "opacity-60"}`}>
              <div className="flex gap-4">
                <div className="w-24 shrink-0">
                  <EstiloImagem estilo={e} />
                </div>
                <div className="flex flex-1 flex-col items-start justify-between gap-2">
                  <Selo ativo={e.ativo} />
                  <BotaoAtivo ativo={e.ativo} acao={alternarEstilo.bind(null, e.id, !e.ativo)} />
                </div>
              </div>
              <EstiloForm acao={editarEstilo.bind(null, e.id)} botao="Salvar" nome={e.nome} temMidia={Boolean(e.imagemUrl)} blob={blob} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
