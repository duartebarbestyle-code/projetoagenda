"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

const iso = (a: number, m: number, d: number) =>
  `${a}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export function FiltrosAgenda({
  dia,
  hoje,
  diasComAgenda,
  servicos,
  horarios,
}: {
  dia: string;
  hoje: string;
  diasComAgenda: string[];
  servicos: { id: number; nome: string }[];
  horarios: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [aberto, setAberto] = useState(false);
  const [ano, mes] = dia.split("-").map(Number);
  const [vista, setVista] = useState({ ano, mes: mes - 1 });
  const caixa = useRef<HTMLDivElement>(null);

  // Fecha o calendário ao clicar fora
  useEffect(() => {
    if (!aberto) return;
    const fechar = (e: MouseEvent) => !caixa.current?.contains(e.target as Node) && setAberto(false);
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, [aberto]);

  function aplicar(mudancas: Record<string, string>) {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(mudancas)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    router.push(`${pathname}?${p}`);
  }

  function escolherDia(d: string) {
    setAberto(false);
    aplicar({ dia: d === hoje ? "" : d });
  }

  const moverMes = (n: number) =>
    setVista(({ ano, mes }) => {
      const d = new Date(ano, mes + n, 1);
      return { ano: d.getFullYear(), mes: d.getMonth() };
    });

  const primeiroDia = new Date(vista.ano, vista.mes, 1).getDay();
  const totalDias = new Date(vista.ano, vista.mes + 1, 0).getDate();
  const comAgenda = new Set(diasComAgenda);
  const [a, m, d] = dia.split("-");
  const rotuloDia = dia === hoje ? `Hoje, ${d}/${m}` : `${d}/${m}/${a}`;

  const servico = params.get("servico") ?? "";
  const de = params.get("de") ?? "";
  const ate = params.get("ate") ?? "";

  return (
    <div className="mb-8 flex flex-wrap items-end gap-3">
      <div ref={caixa} className="relative">
        <span className="label">Dia</span>
        <button type="button" className="input flex w-auto min-w-40 items-center gap-2 py-2" onClick={() => setAberto((v) => !v)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          {rotuloDia}
        </button>

        {aberto && (
          <div className="absolute z-10 mt-2 w-72 rounded-lg border border-steel bg-obsidian p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <button type="button" className="rounded-md px-2 py-1 text-graphite hover:text-signal" onClick={() => moverMes(-1)} aria-label="Mês anterior">
                ‹
              </button>
              <span className="font-semibold">
                {MESES[vista.mes]} {vista.ano}
              </span>
              <button type="button" className="rounded-md px-2 py-1 text-graphite hover:text-signal" onClick={() => moverMes(1)} aria-label="Próximo mês">
                ›
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[13px]">
              {SEMANA.map((s, i) => (
                <span key={i} className="py-1 text-ash">{s}</span>
              ))}
              {Array.from({ length: primeiroDia }, (_, i) => (
                <span key={`v${i}`} />
              ))}
              {Array.from({ length: totalDias }, (_, i) => {
                const data = iso(vista.ano, vista.mes, i + 1);
                const selecionado = data === dia;
                return (
                  <button
                    key={data}
                    type="button"
                    onClick={() => escolherDia(data)}
                    className={`relative rounded-md py-1.5 transition ${
                      selecionado ? "bg-cobalt font-semibold text-white" : data === hoje ? "text-signal hover:bg-steel" : "hover:bg-steel"
                    }`}
                  >
                    {i + 1}
                    {comAgenda.has(data) && !selecionado && (
                      <span className="absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-signal" />
                    )}
                  </button>
                );
              })}
            </div>
            <button type="button" className="mt-3 text-[13px] text-signal hover:underline" onClick={() => escolherDia(hoje)}>
              Ir para hoje
            </button>
          </div>
        )}
      </div>

      <label>
        <span className="label">Serviço</span>
        <select className="input w-auto py-2" value={servico} onChange={(e) => aplicar({ servico: e.target.value })}>
          <option value="">Todos</option>
          {servicos.map((s) => (
            <option key={s.id} value={s.id}>{s.nome}</option>
          ))}
        </select>
      </label>

      <label>
        <span className="label">De</span>
        <select className="input w-auto py-2" value={de} onChange={(e) => aplicar({ de: e.target.value })}>
          <option value="">Início</option>
          {horarios.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
      </label>

      <label>
        <span className="label">Até</span>
        <select className="input w-auto py-2" value={ate} onChange={(e) => aplicar({ ate: e.target.value })}>
          <option value="">Fim</option>
          {horarios.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
      </label>

      {(servico || de || ate) && (
        <button type="button" className="pb-2.5 text-[13px] text-graphite hover:text-signal" onClick={() => aplicar({ servico: "", de: "", ate: "" })}>
          Limpar filtros
        </button>
      )}
    </div>
  );
}
