"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { Estilo } from "@/components/estilo-card";
import { mascaraCelular, mascaraCpf } from "@/lib/mascaras";
import { Wizard } from "@/app/agendar/wizard";
import {
  buscarClientes,
  cadastrarRapido,
  criarParaCliente,
  horariosAdmin,
  servicosAdmin,
  type ClienteBusca,
} from "../../agendamento-actions";

type Props = Omit<React.ComponentProps<typeof Wizard>, "acoes" | "inicial" | "destino" | "textoConfirmar"> & {
  estilos: Estilo[];
};

export function NovoAgendamento(props: Props) {
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<ClienteBusca[] | null>(null);
  const [cliente, setCliente] = useState<ClienteBusca | null>(null);
  const [novo, setNovo] = useState<{ nomeCompleto: string; cpf: string; celular: string } | null>(null);
  const [erro, setErro] = useState("");
  const [salvando, iniciar] = useTransition();

  function abrirCadastro() {
    const soNumeros = /^[\d.\-\s]+$/.test(termo.trim());
    setNovo({ nomeCompleto: soNumeros ? "" : termo.trim(), cpf: soNumeros ? mascaraCpf(termo) : "", celular: "" });
    setErro("");
  }

  function salvarNovo(e: React.FormEvent) {
    e.preventDefault();
    if (!novo) return;
    iniciar(async () => {
      const r = await cadastrarRapido(novo);
      if (!r.ok) return setErro(r.erro);
      setNovo(null);
      setCliente(r.cliente);
    });
  }

  // Busca enquanto digita (espera 300 ms)
  useEffect(() => {
    if (termo.trim().length < 2) return;
    const t = setTimeout(() => buscarClientes(termo).then(setResultados), 300);
    return () => clearTimeout(t);
  }, [termo]);

  const acoes = useMemo(
    () =>
      cliente && {
        carregarHorarios: horariosAdmin.bind(null, null),
        carregarServicos: servicosAdmin.bind(null, null),
        confirmarAgendamento: criarParaCliente.bind(null, cliente.userId),
      },
    [cliente],
  );

  if (novo)
    return (
      <form onSubmit={salvarNovo} className="card grid grid-cols-6 gap-4">
        <div className="col-span-6">
          <h2 className="text-[19px] font-semibold">Cadastro rápido</h2>
          <p className="text-[13px] text-graphite">
            O cliente completa e-mail e endereço quando entrar no app com este celular.
          </p>
        </div>
        <label className="col-span-6">
          <span className="label">Nome completo</span>
          <input className="input" autoFocus value={novo.nomeCompleto} onChange={(e) => setNovo({ ...novo, nomeCompleto: e.target.value })} />
        </label>
        <label className="col-span-3">
          <span className="label">CPF</span>
          <input className="input" inputMode="numeric" placeholder="000.000.000-00" value={novo.cpf} onChange={(e) => setNovo({ ...novo, cpf: mascaraCpf(e.target.value) })} />
        </label>
        <label className="col-span-3">
          <span className="label">Celular (para lembretes)</span>
          <input className="input" inputMode="tel" placeholder="(11) 91234-5678" value={novo.celular} onChange={(e) => setNovo({ ...novo, celular: mascaraCelular(e.target.value) })} />
        </label>
        {erro && <p className="col-span-6 text-[13px] text-red-400">{erro}</p>}
        <div className="col-span-6 flex gap-3">
          <button className="btn-primary" disabled={salvando}>{salvando ? "Salvando..." : "Cadastrar e continuar"}</button>
          <button type="button" className="btn-ghost" onClick={() => setNovo(null)}>Voltar</button>
        </div>
      </form>
    );

  if (!cliente || !acoes)
    return (
      <section className="card">
        <label className="label" htmlFor="busca">Cliente (nome completo ou CPF)</label>
        <input
          id="busca"
          className="input"
          autoFocus
          placeholder="Ex: João da Silva ou 529.982.247-25"
          value={termo}
          onChange={(e) => {
            setTermo(e.target.value);
            if (e.target.value.trim().length < 2) setResultados(null);
          }}
        />
        {resultados && (
          <ul className="mt-4 space-y-2">
            {resultados.length === 0 && <li className="text-[15px] text-graphite">Nenhum cliente encontrado.</li>}
            {resultados.map((c) => (
              <li key={c.userId}>
                <button className="option w-full" onClick={() => setCliente(c)}>
                  <div className="font-semibold">{c.nome}</div>
                  <div className="text-[13px] text-graphite">
                    CPF {mascaraCpf(c.cpf)} · {mascaraCelular(c.celular)}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
        <button className="mt-4 text-[15px] font-medium text-signal hover:underline" onClick={abrirCadastro}>
          + Cliente sem cadastro? Cadastrar rápido
        </button>
      </section>
    );

  return (
    <div className="space-y-8">
      <div className="card flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Cliente</p>
          <div className="font-semibold">{cliente.nome}</div>
          <div className="text-[13px] text-graphite">
            CPF {mascaraCpf(cliente.cpf)} · {mascaraCelular(cliente.celular)}
          </div>
        </div>
        <button className="text-[13px] text-graphite hover:text-signal" onClick={() => setCliente(null)}>
          Trocar
        </button>
      </div>
      <Wizard {...props} acoes={acoes} destino={(d) => `/admin?dia=${d}`} textoConfirmar="Marcar horário" />
    </div>
  );
}
