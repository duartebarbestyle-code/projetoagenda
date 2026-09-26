"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { mascaraCpf } from "@/lib/mascaras";
import { buscarConta, confirmarCodigo, enviarCodigo, type Canal } from "./actions";

type Conta = { celular: string | null; email: string | null };

export function RecuperarForm() {
  const router = useRouter();
  const [cpf, setCpf] = useState("");
  const [conta, setConta] = useState<Conta | null>(null);
  const [canal, setCanal] = useState<Canal | null>(null);
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();

  const rodar = (fn: () => Promise<void>) => {
    setErro("");
    iniciar(fn);
  };

  if (!conta)
    return (
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          rodar(async () => {
            const c = await buscarConta(cpf);
            if (!c) return setErro("Nenhuma conta com esse CPF.");
            setConta(c);
          });
        }}
      >
        <label className="label" htmlFor="cpf">CPF</label>
        <input id="cpf" className="input" inputMode="numeric" placeholder="000.000.000-00" value={cpf} onChange={(e) => setCpf(mascaraCpf(e.target.value))} />
        <button className="btn-primary w-full" disabled={pendente}>Continuar</button>
        {erro && <p className="text-[13px] text-red-400">{erro}</p>}
        <p className="text-[13px] text-graphite">
          Ainda não tem conta? <Link href="/entrar?cadastro=1" className="text-signal">Cadastre-se</Link>
        </p>
      </form>
    );

  if (!canal)
    return (
      <div className="space-y-3">
        <p className="text-graphite">Onde quer receber o código?</p>
        {(
          [
            ["sms", "SMS", conta.celular],
            ["email", "E-mail", conta.email],
          ] as const
        ).map(
          ([c, rotulo, destino]) =>
            destino && (
              <button
                key={c}
                className="option w-full"
                disabled={pendente}
                onClick={() =>
                  rodar(async () => {
                    if (!(await enviarCodigo(cpf, c))) return setErro("Não foi possível enviar o código.");
                    setCanal(c);
                  })
                }
              >
                <div className="font-semibold">{rotulo}</div>
                <div className="text-[13px] text-graphite">{destino}</div>
              </button>
            ),
        )}
        {erro && <p className="text-[13px] text-red-400">{erro}</p>}
      </div>
    );

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        rodar(async () => {
          if (!(await confirmarCodigo(cpf, canal, codigo))) return setErro("Código inválido ou expirado.");
          router.push("/");
          router.refresh();
        });
      }}
    >
      <label className="label" htmlFor="codigo">
        Código enviado para {canal === "sms" ? conta.celular : conta.email}
      </label>
      <input
        id="codigo"
        className="input tracking-[0.3em]"
        inputMode="numeric"
        maxLength={6}
        value={codigo}
        onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
      />
      <button className="btn-primary w-full" disabled={pendente || codigo.length < 6}>Entrar</button>
      <button type="button" className="text-[13px] text-graphite hover:text-signal" onClick={() => setCanal(null)}>
        Escolher outro meio
      </button>
      {erro && <p className="text-[13px] text-red-400">{erro}</p>}
    </form>
  );
}
