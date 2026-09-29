import { exigirAdmin } from "@/lib/sessao";
import { asc, desc } from "drizzle-orm";
import { db } from "@/db";
import { profissionais } from "@/db/schema";
import { FotoProfissional } from "@/components/foto-profissional";
import { alternarProfissional, criarProfissional, editarProfissional } from "../cadastros-actions";
import { BotaoAtivo, Selo } from "../botao-ativo";
import { ProfissionalForm } from "./profissional-form";

export default async function Profissionais() {
  await exigirAdmin();
  const blob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  const lista = await db.select().from(profissionais).orderBy(desc(profissionais.ativo), asc(profissionais.id));
  return (
    <div className="space-y-8">
      <section className="card">
        <h2 className="mb-4 text-[19px] font-semibold">Novo profissional</h2>
        <ProfissionalForm acao={criarProfissional} botao="Adicionar" blob={blob} />
      </section>

      <section>
        <h2 className="mb-1 text-[19px] font-semibold">Profissionais</h2>
        <p className="mb-4 text-[13px] text-graphite">
          Inativos não aparecem para o cliente. Horários já marcados continuam. A foto aparece para o cliente na hora
          de escolher o profissional. Com WhatsApp preenchido, o barbeiro recebe a agenda do dia às 7h30 e um aviso a
          cada agendamento novo, alterado ou cancelado.
        </p>
        <ul className="space-y-3">
          {lista.map((p) => (
            <li key={p.id} className={`card flex flex-wrap items-end gap-4 ${p.ativo ? "" : "opacity-60"}`}>
              <FotoProfissional profissional={p} className="size-16" />
              <ProfissionalForm
                acao={editarProfissional.bind(null, p.id)}
                botao="Salvar"
                nome={p.nome}
                telefone={p.telefone ?? ""}
                temFoto={Boolean(p.fotoUrl)}
                blob={blob}
                className="flex-1"
              />
              <Selo ativo={p.ativo} />
              <BotaoAtivo ativo={p.ativo} acao={alternarProfissional.bind(null, p.id, !p.ativo)} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
