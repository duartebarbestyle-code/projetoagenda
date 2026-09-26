import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { estilos } from "@/db/schema";
import { EstiloImagem } from "@/components/estilo-card";

export default async function Portfolio() {
  const lista = await db
    .select({ id: estilos.id, nome: estilos.nome, imagemUrl: estilos.imagemUrl })
    .from(estilos)
    .where(eq(estilos.ativo, true))
    .orderBy(estilos.id);

  return (
    <div>
      <p className="eyebrow">Portfólio</p>
      <h1 className="mt-2 mb-8 text-[34px] font-bold leading-tight tracking-tight">Estilos de corte</h1>

      {lista.length === 0 ? (
        <div className="card text-graphite">Em breve.</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {lista.map((e) => (
            <figure key={e.id} className="card p-3">
              <EstiloImagem estilo={e} />
              <figcaption className="mt-3 font-semibold">{e.nome}</figcaption>
            </figure>
          ))}
        </div>
      )}

      <Link href="/agendar" className="btn-primary mt-8">Agendar um corte</Link>
    </div>
  );
}
