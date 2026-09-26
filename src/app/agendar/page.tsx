import { eq } from "drizzle-orm";
import { db } from "@/db";
import { estilos, servicos } from "@/db/schema";
import { DIAS_A_FRENTE, EXPEDIENTE } from "@/lib/config";
import { exigirClienteComum } from "@/lib/sessao";
import { dataLocal, diaDaSemana, somarDias } from "@/lib/time";
import { Wizard } from "./wizard";

export default async function Agendar() {
  const { cliente } = await exigirClienteComum();
  const [lista, listaEstilos] = await Promise.all([
    db.select().from(servicos).where(eq(servicos.ativo, true)).orderBy(servicos.id),
    db
      .select({ id: estilos.id, nome: estilos.nome, imagemUrl: estilos.imagemUrl })
      .from(estilos)
      .where(eq(estilos.ativo, true))
      .orderBy(estilos.id),
  ]);

  const hoje = dataLocal();
  const dias = Array.from({ length: DIAS_A_FRENTE }, (_, i) => somarDias(hoje, i)).map((d) => ({
    data: d,
    aberto: EXPEDIENTE[diaDaSemana(d)] !== null,
  }));

  return (
    <div>
      <p className="eyebrow">Olá, {cliente.nome}</p>
      <h1 className="mt-2 mb-8 text-[34px] font-bold leading-tight tracking-tight">Agende seu horário</h1>
      <Wizard
        servicos={lista.map(({ id, nome, duracaoMin, precoCentavos, permiteEstilo }) => ({
          id,
          nome,
          duracaoMin,
          precoCentavos,
          permiteEstilo,
        }))}
        estilos={listaEstilos}
        dias={dias}
      />
    </div>
  );
}
