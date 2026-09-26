"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { fmtPreco, paraDate } from "@/lib/time";
import { EstiloImagem, type Estilo } from "@/components/estilo-card";
import type { DadosAgendamento, Resultado } from "@/lib/agendamento";
import * as acoesCliente from "./actions";

type Servico = { id: number; nome: string; duracaoMin: number; precoCentavos: number; permiteEstilo: boolean };
type Dia = { data: string; aberto: boolean };
type Profissional = { id: number; nome: string };

// O admin usa o mesmo assistente com as próprias ações (marcar para um cliente, editar)
export type Acoes = {
  carregarHorarios: (servicoId: number, data: string) => Promise<string[]>;
  carregarProfissionais: (servicoId: number, data: string, horario: string) => Promise<Profissional[]>;
  confirmarAgendamento: (input: DadosAgendamento) => Promise<Resultado>;
};
export type Inicial = { servicoId: number; data: string; horario: string; profissional: Profissional; estiloId: number | null; observacao: string };

const fmtDia = (d: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "short", day: "2-digit", month: "short" })
    .format(paraDate(d, "12:00"))
    .replace(".", "");

export function Wizard({
  servicos,
  estilos,
  dias,
  acoes = acoesCliente,
  inicial,
  destino = "/meus-agendamentos?novo=1",
  textoConfirmar = "Confirmar agendamento",
}: {
  servicos: Servico[];
  estilos: Estilo[];
  dias: Dia[];
  acoes?: Acoes;
  inicial?: Inicial;
  destino?: string | ((data: string) => string);
  textoConfirmar?: string;
}) {
  const { carregarHorarios, carregarProfissionais, confirmarAgendamento } = acoes;
  const router = useRouter();
  const [servico, setServico] = useState<Servico | null>(servicos.find((s) => s.id === inicial?.servicoId) ?? null);
  const [data, setData] = useState<string | null>(inicial?.data ?? null);
  const [horario, setHorario] = useState<string | null>(inicial?.horario ?? null);
  const [pro, setPro] = useState<Profissional | null>(inicial?.profissional ?? null);
  const [verEstilos, setVerEstilos] = useState(false);
  const [estilo, setEstilo] = useState<Estilo | null>(estilos.find((e) => e.id === inicial?.estiloId) ?? null);
  const [observacao, setObservacao] = useState(inicial?.observacao ?? "");
  const [horarios, setHorarios] = useState<string[] | null>(null);
  const [pros, setPros] = useState<Profissional[] | null>(null);
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();

  // Recarrega horários (os que já passaram somem) a cada troca e a cada minuto
  useEffect(() => {
    if (!servico || !data) return;
    const atualizar = () =>
      carregarHorarios(servico.id, data).then((h) => {
        setHorarios(h);
        setHorario((atual) => (atual && !h.includes(atual) ? null : atual));
      });
    atualizar();
    const t = setInterval(atualizar, 60_000);
    return () => clearInterval(t);
  }, [servico, data, carregarHorarios]);

  useEffect(() => {
    if (!servico || !data || !horario) return;
    carregarProfissionais(servico.id, data, horario).then((lista) => {
      setPros(lista);
      setPro((atual) => (atual && !lista.some((p) => p.id === atual.id) ? null : atual));
    });
  }, [servico, data, horario, carregarProfissionais]);

  function escolherServico(s: Servico) {
    setServico(s);
    if (!s.permiteEstilo) {
      setVerEstilos(false);
      setEstilo(null);
      setObservacao("");
    }
    setHorarios(null);
    setHorario(null);
    setPro(null);
  }
  function escolherDia(d: string) {
    setData(d);
    setHorarios(null);
    setHorario(null);
    setPro(null);
  }
  function escolherHorario(h: string) {
    setHorario(h);
    setPros(null);
    setPro(null);
  }

  function confirmar() {
    if (!servico || !data || !horario || !pro) return;
    setErro("");
    iniciar(async () => {
      const r = await confirmarAgendamento({
        servicoId: servico.id,
        data,
        horario,
        profissionalId: pro.id,
        estiloId: estilo?.id ?? null,
        observacao,
      });
      if (!r.ok) {
        setErro(r.erro);
        setHorario(null);
        setPro(null);
        setHorarios(await carregarHorarios(servico.id, data));
        return;
      }
      router.push(typeof destino === "function" ? destino(data) : destino);
      router.refresh();
    });
  }

  return (
    <div className="space-y-10">
      <Etapa
        n={1}
        titulo="Serviço"
        acao={
          servico?.permiteEstilo && estilos.length > 0 ? (
            <button className="text-[15px] font-medium text-signal hover:underline" onClick={() => setVerEstilos((v) => !v)}>
              {estilo ? `Estilo: ${estilo.nome}` : "Selecionar estilo"} {verEstilos ? "▴" : "▾"}
            </button>
          ) : null
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {servicos.map((s) => (
            <button key={s.id} className="option" data-ativo={servico?.id === s.id} onClick={() => escolherServico(s)}>
              <div className="font-semibold">{s.nome}</div>
              <div className="text-[13px] text-graphite">
                {s.duracaoMin} min · {fmtPreco(s.precoCentavos)}
              </div>
            </button>
          ))}
        </div>

        {servico?.permiteEstilo && (
          <div className="mt-6 space-y-4">
            {verEstilos && (
              <div>
                <p className="mb-3 text-[13px] text-graphite">Opcional. Toque de novo para desmarcar.</p>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                  {estilos.map((e) => (
                    <button
                      key={e.id}
                      className="option p-2"
                      data-ativo={estilo?.id === e.id}
                      onClick={() => setEstilo(estilo?.id === e.id ? null : e)}
                    >
                      <EstiloImagem estilo={e} />
                      <div className="mt-2 text-center text-[13px] font-medium">{e.nome}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="label" htmlFor="observacao">Observação (opcional)</label>
              <textarea
                id="observacao"
                className="input min-h-20"
                maxLength={500}
                placeholder="Ex: manter o comprimento em cima, risco do lado esquerdo..."
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
              />
            </div>
          </div>
        )}
      </Etapa>

      {servico && (
        <Etapa n={2} titulo="Dia">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {dias.map((d) => (
              <button
                key={d.data}
                disabled={!d.aberto}
                className="option shrink-0 text-center capitalize disabled:cursor-not-allowed disabled:opacity-30"
                data-ativo={data === d.data}
                onClick={() => escolherDia(d.data)}
              >
                {fmtDia(d.data)}
              </button>
            ))}
          </div>
        </Etapa>
      )}

      {servico && data && (
        <Etapa n={3} titulo="Horário">
          {horarios === null ? (
            <p className="text-graphite">Carregando...</p>
          ) : horarios.length === 0 ? (
            <p className="text-graphite">Sem horários livres neste dia.</p>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {horarios.map((h) => (
                <button key={h} className="option text-center" data-ativo={horario === h} onClick={() => escolherHorario(h)}>
                  {h}
                </button>
              ))}
            </div>
          )}
        </Etapa>
      )}

      {servico && data && horario && (
        <Etapa n={4} titulo="Profissional">
          {pros === null ? (
            <p className="text-graphite">Carregando...</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              {pros.map((p) => (
                <button key={p.id} className="option" data-ativo={pro?.id === p.id} onClick={() => setPro(p)}>
                  {p.nome}
                </button>
              ))}
            </div>
          )}
        </Etapa>
      )}

      {servico && data && horario && pro && (
        <div className="card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-semibold">
              {servico.nome}
              {estilo && ` · ${estilo.nome}`} com {pro.nome}
            </div>
            <div className="text-[15px] capitalize text-graphite">
              {fmtDia(data)} às {horario} · {fmtPreco(servico.precoCentavos)}
            </div>
          </div>
          <button className="btn-primary" disabled={pendente} onClick={confirmar}>
            {pendente ? "Confirmando..." : textoConfirmar}
          </button>
        </div>
      )}

      {erro && <p className="text-red-400">{erro}</p>}
    </div>
  );
}

function Etapa({
  n,
  titulo,
  acao,
  children,
}: {
  n: number;
  titulo: string;
  acao?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 text-[19px] font-semibold">
          <span className="flex size-7 items-center justify-center rounded-md bg-cobalt text-[13px]">{n}</span>
          {titulo}
        </h2>
        {acao}
      </div>
      {children}
    </section>
  );
}
