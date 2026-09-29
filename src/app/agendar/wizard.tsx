"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { fmtPreco, paraDate } from "@/lib/time";
import { EstiloImagem, type Estilo } from "@/components/estilo-card";
import { FotoProfissional, type Profissional } from "@/components/foto-profissional";
import type { DadosAgendamento, Resultado } from "@/lib/agendamento";
import * as acoesCliente from "./actions";

type Servico = { id: number; nome: string; duracaoMin: number; precoCentavos: number; permiteEstilo: boolean };
type Dia = { data: string; aberto: boolean };

// O admin usa o mesmo assistente com as próprias ações (marcar para um cliente, editar)
export type Acoes = {
  carregarHorarios: (profissionalId: number, data: string) => Promise<string[]>;
  carregarServicos: (profissionalId: number, data: string, horario: string) => Promise<number[]>;
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
  profissionais,
  dias,
  acoes = acoesCliente,
  inicial,
  destino = "/meus-agendamentos?novo=1",
  textoConfirmar = "Confirmar agendamento",
}: {
  servicos: Servico[];
  estilos: Estilo[];
  profissionais: Profissional[];
  dias: Dia[];
  acoes?: Acoes;
  inicial?: Inicial;
  destino?: string | ((data: string) => string);
  textoConfirmar?: string;
}) {
  const { carregarHorarios, carregarServicos, confirmarAgendamento } = acoes;
  const router = useRouter();
  const [pro, setPro] = useState<Profissional | null>(inicial?.profissional ?? null);
  const [data, setData] = useState<string | null>(inicial?.data ?? null);
  const [horario, setHorario] = useState<string | null>(inicial?.horario ?? null);
  const [servico, setServico] = useState<Servico | null>(servicos.find((s) => s.id === inicial?.servicoId) ?? null);
  const [verEstilos, setVerEstilos] = useState(false);
  const [estilo, setEstilo] = useState<Estilo | null>(estilos.find((e) => e.id === inicial?.estiloId) ?? null);
  const [observacao, setObservacao] = useState(inicial?.observacao ?? "");
  const [horarios, setHorarios] = useState<string[] | null>(null);
  const [cabem, setCabem] = useState<number[] | null>(null);
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();

  // Recarrega horários (os que já passaram somem) a cada troca e a cada minuto
  useEffect(() => {
    if (!pro || !data) return;
    const atualizar = () =>
      carregarHorarios(pro.id, data).then((h) => {
        setHorarios(h);
        setHorario((atual) => (atual && !h.includes(atual) ? null : atual));
      });
    atualizar();
    const t = setInterval(atualizar, 60_000);
    return () => clearInterval(t);
  }, [pro, data, carregarHorarios]);

  // Serviços que cabem a partir do horário; o escolhido sai se deixar de caber
  useEffect(() => {
    if (!pro || !data || !horario) return;
    carregarServicos(pro.id, data, horario).then((ids) => {
      setCabem(ids);
      setServico((atual) => (atual && !ids.includes(atual.id) ? null : atual));
    });
  }, [pro, data, horario, carregarServicos]);

  // Tocar de novo na opção marcada desmarca; as etapas seguintes somem até escolher de novo
  function escolherPro(p: Profissional) {
    setPro(pro?.id === p.id ? null : p);
    setHorarios(null);
    setHorario(null);
    setCabem(null);
  }
  function escolherDia(d: string) {
    setData(data === d ? null : d);
    setHorarios(null);
    setHorario(null);
    setCabem(null);
  }
  function escolherHorario(h: string) {
    setHorario(horario === h ? null : h);
    setCabem(null);
  }
  function escolherServico(s: Servico) {
    if (servico?.id === s.id) return setServico(null);
    setServico(s);
    if (!s.permiteEstilo) {
      setVerEstilos(false);
      setEstilo(null);
      setObservacao("");
    }
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
        setCabem(null);
        setHorarios(await carregarHorarios(pro.id, data));
        return;
      }
      router.push(typeof destino === "function" ? destino(data) : destino);
      router.refresh();
    });
  }

  return (
    <div className="space-y-10">
      <Etapa n={1} titulo="Profissional">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {profissionais.map((p) => (
            <button
              key={p.id}
              className="option flex flex-col items-center gap-3 py-5 text-center"
              data-ativo={pro?.id === p.id}
              onClick={() => escolherPro(p)}
            >
              <FotoProfissional profissional={p} />
              <span className="font-semibold">{p.nome}</span>
            </button>
          ))}
        </div>
      </Etapa>

      {pro && (
        <Etapa n={2} titulo="Dia">
          <Dias dias={dias} data={data} onEscolher={escolherDia} />
        </Etapa>
      )}

      {pro && data && (
        <Etapa n={3} titulo="Horário">
          {horarios === null ? (
            <p className="text-graphite">Carregando...</p>
          ) : horarios.length === 0 ? (
            <p className="text-graphite">Sem horários livres com {pro.nome} neste dia.</p>
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

      {pro && data && horario && (
        <Etapa
          n={4}
          titulo="Serviço"
          acao={
            servico?.permiteEstilo && estilos.length > 0 ? (
              <button className="text-[15px] font-medium text-signal hover:underline" onClick={() => setVerEstilos((v) => !v)}>
                {estilo ? `Estilo: ${estilo.nome}` : "Selecionar estilo"} {verEstilos ? "▴" : "▾"}
              </button>
            ) : null
          }
        >
          {cabem === null ? (
            <p className="text-graphite">Carregando...</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {servicos.map((s) => (
                <button
                  key={s.id}
                  className="option disabled:cursor-not-allowed disabled:opacity-30"
                  disabled={!cabem.includes(s.id)}
                  data-ativo={servico?.id === s.id}
                  onClick={() => escolherServico(s)}
                >
                  <div className="font-semibold">{s.nome}</div>
                  <div className="text-[13px] text-graphite">
                    {s.duracaoMin} min · {fmtPreco(s.precoCentavos)}
                    {!cabem.includes(s.id) && " · não cabe neste horário"}
                  </div>
                </button>
              ))}
            </div>
          )}

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
      )}

      {pro && data && horario && servico && (
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

const partesDia = (d: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", ...opts }).format(paraDate(d, "12:00")).replace(".", "");

// Fileira de dias (o primeiro é hoje), rolável; no computador, setas nas pontas
function Dias({ dias, data, onEscolher }: { dias: Dia[]; data: string | null; onEscolher: (d: string) => void }) {
  const trilho = useRef<HTMLDivElement>(null);

  // Ao editar, o dia já escolhido pode estar fora da tela
  useEffect(() => {
    trilho.current?.querySelector('[data-ativo="true"]')?.scrollIntoView({ block: "nearest", inline: "center" });
  }, []);

  const rolar = (lado: 1 | -1) => {
    const t = trilho.current;
    t?.scrollBy({ left: lado * t.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div
        ref={trilho}
        className="flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:none] sm:scroll-px-10 sm:px-10[&::-webkit-scrollbar]:hidden"
      >
        {dias.map((d, i) => (
          <button
            key={d.data}
            disabled={!d.aberto}
            data-ativo={data === d.data}
            onClick={() => onEscolher(d.data)}
            className="group flex w-[4.5rem] shrink-0 snap-start flex-col items-center gap-1 rounded-lg border border-steel bg-obsidian py-3 transition hover:border-signal disabled:cursor-not-allowed disabled:border-dashed disabled:bg-transparent disabled:opacity-40 disabled:hover:border-steel data-[ativo=true]:border-signal data-[ativo=true]:bg-signal"
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-graphite group-data-[ativo=true]:text-white/80">
              {i === 0 ? "Hoje" : i === 1 ? "Amanhã" : partesDia(d.data, { weekday: "short" })}
            </span>
            <span className="text-[24px] font-bold leading-none group-data-[ativo=true]:text-white">
              {partesDia(d.data, { day: "numeric" })}
            </span>
            <span className="text-[12px] text-graphite group-data-[ativo=true]:text-white/80">
              {d.aberto ? partesDia(d.data, { month: "short" }) : "fechado"}
            </span>
          </button>
        ))}
      </div>
      {([-1, 1] as const).map((lado) => (
        <button
          key={lado}
          aria-label={lado < 0 ? "Dias anteriores" : "Próximos dias"}
          onClick={() => rolar(lado)}
          className={`absolute top-1/2 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full border border-steel bg-onyx text-graphite transition hover:border-signal hover:text-signal sm:flex ${lado < 0 ? "left-0" : "right-0"}`}
        >
          {lado < 0 ? "‹" : "›"}
        </button>
      ))}
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
