import { exigirAdmin } from "@/lib/sessao";
import { mascaraCelular, mascaraCpf } from "@/lib/mascaras";
import { fmtDataCompleta } from "@/lib/time";
import { listarClientes } from "./dados";

export default async function Clientes({ searchParams }: PageProps<"/admin/clientes">) {
  await exigirAdmin();
  const q = await searchParams;
  const busca = typeof q.q === "string" ? q.q : "";
  const lista = await listarClientes(busca);
  const exportar = `/admin/clientes/exportar${busca ? `?q=${encodeURIComponent(busca)}` : ""}`;
  const data = (d: Date | null) => (d ? fmtDataCompleta(d) : "—");

  return (
    <div>
      <p className="eyebrow">Painel</p>
      <div className="mt-2 mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[34px] font-bold leading-tight tracking-tight">Clientes</h1>
        {/* Link comum: o navegador baixa o arquivo */}
        <a href={exportar} className="btn-ghost" download>
          Exportar para Excel
        </a>
      </div>

      <form className="mb-6 flex gap-3">
        <input
          name="q"
          defaultValue={busca}
          className="input"
          placeholder="Buscar por nome, e-mail ou CPF"
          aria-label="Buscar cliente"
        />
        <button className="btn-primary">Buscar</button>
      </form>

      <p className="mb-4 text-[13px] text-graphite">
        {lista.length} {lista.length === 1 ? "cliente" : "clientes"}
        {busca && ` para "${busca}"`}. A exportação leva os clientes desta lista, com endereço completo.
      </p>

      {lista.length === 0 ? (
        <div className="card text-[15px] text-graphite">Nenhum cliente encontrado.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-steel">
          <table className="w-full min-w-[720px] text-left text-[14px]">
            <thead className="bg-onyx text-[12px] uppercase tracking-[0.06em] text-graphite">
              <tr>
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Contato</th>
                <th className="px-4 py-3 font-semibold">Cidade</th>
                <th className="px-4 py-3 text-right font-semibold">Atend.</th>
                <th className="px-4 py-3 font-semibold">Último</th>
                <th className="px-4 py-3 font-semibold">Próximo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-steel">
              {lista.map((c) => (
                <tr key={c.userId} className="bg-obsidian align-top">
                  <td className="px-4 py-3">
                    <div className="font-semibold">
                      {c.nome} {c.sobrenome}
                    </div>
                    <div className="text-[12px] text-graphite">
                      CPF {mascaraCpf(c.cpf)}
                      {!c.email && " · cadastro no balcão"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{mascaraCelular(c.celular)}</div>
                    <div className="text-[12px] text-graphite">{c.email ?? "sem e-mail"}</div>
                  </td>
                  <td className="px-4 py-3">{c.cidade ? `${c.cidade}/${c.uf}` : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {c.realizados}
                    {c.faltas > 0 && <div className="text-[12px] text-red-400">{c.faltas} {c.faltas === 1 ? "falta" : "faltas"}</div>}
                  </td>
                  <td className="px-4 py-3">{data(c.ultimo)}</td>
                  <td className="px-4 py-3">{data(c.proximo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
