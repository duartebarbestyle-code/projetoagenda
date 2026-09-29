import { eq } from "drizzle-orm";
import { db } from "@/db";
import { estilos, profissionais, servicos } from "@/db/schema";
import { EXPEDIENTE } from "@/lib/config";
import { dataLocal, diaDaSemana, somarDias } from "@/lib/time";

// Admin pode marcar com mais antecedência que o cliente
const DIAS_ADMIN = 45;

export async function dadosDoAssistente(incluirDia?: string) {
  const [lista, listaEstilos, pros] = await Promise.all([
    db.select().from(servicos).where(eq(servicos.ativo, true)).orderBy(servicos.id),
    db
      .select({ id: estilos.id, nome: estilos.nome, imagemUrl: estilos.imagemUrl })
      .from(estilos)
      .where(eq(estilos.ativo, true))
      .orderBy(estilos.id),
    db
      .select({ id: profissionais.id, nome: profissionais.nome, fotoUrl: profissionais.fotoUrl })
      .from(profissionais)
      .where(eq(profissionais.ativo, true))
      .orderBy(profissionais.id),
  ]);
  const hoje = dataLocal();
  const datas = Array.from({ length: DIAS_ADMIN }, (_, i) => somarDias(hoje, i));
  if (incluirDia && !datas.includes(incluirDia) && incluirDia > hoje) datas.push(incluirDia);
  return {
    servicos: lista.map(({ id, nome, duracaoMin, precoCentavos, permiteEstilo }) => ({ id, nome, duracaoMin, precoCentavos, permiteEstilo })),
    estilos: listaEstilos,
    profissionais: pros,
    dias: datas.map((d) => ({ data: d, aberto: EXPEDIENTE[diaDaSemana(d)] !== null })),
  };
}
