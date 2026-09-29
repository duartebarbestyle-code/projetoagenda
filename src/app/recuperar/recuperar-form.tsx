"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { mascaraCpf } from "@/lib/mascaras";
import { buscarConta, confirmarCodigo, enviarCodigo } from "./actions";

export function RecuperarForm() {
  const router = useRouter();
  const [cpf, setCpf] = useState("");
  const [conta, setConta] = useState<{ email: string | null } | null>(null);
  const [enviado, setEnviado] = useState(false);
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

  // Cadastro feito pelo barbeiro no balcão: a conta é criada pelo e-mail e assume esse cadastro
  if (!conta.email)
    return (
      <div className="space-y-4">
        <p className="text-graphite">
          Seu cadastro foi feito na barbearia e ainda não tem e-mail. Crie sua conta com seu e-mail e, no cadastro,
          informe este mesmo CPF e o celular que você deu na barbearia. Seus horários continuam lá.
        </p>
        <Link href="/entrar?cadastro=1" className="btn-primary w-full">Criar conta</Link>
      </div>
    );

  if (!enviado)
    return (
      <div className="space-y-3">
        <p className="text-graphite">Vamos mandar um código para o e-mail da sua conta:</p>
        <p className="font-semibold">{conta.email}</p>
        <button
          className="btn-primary w-full"
          disabled={pendente}
          onClick={() =>
            rodar(async () => {
              if (!(await enviarCodigo(cpf))) return setErro("Não foi possível enviar o código.");
              setEnviado(true);
            })
          }
        >
          {pendente ? "Enviando..." : "Enviar código"}
        </button>
        {erro && <p className="text-[13px] text-red-400">{erro}</p>}
      </div>
    );

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        rodar(async () => {
          if (!(await confirmarCodigo(cpf, codigo))) return setErro("Código inválido ou expirado.");
          router.push("/");
          router.refresh();
        });
      }}
    >
      <label className="label" htmlFor="codigo">Código enviado para {conta.email}</label>
      <input
        id="codigo"
        className="input tracking-[0.3em]"
        inputMode="numeric"
        maxLength={6}
        value={codigo}
        onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
      />
      <button className="btn-primary w-full" disabled={pendente || codigo.length < 6}>Entrar</button>
      <p className="text-[13px] text-graphite">Não chegou? Veja a caixa de spam ou lixo eletrônico.</p>
      {erro && <p className="text-[13px] text-red-400">{erro}</p>}
    </form>
  );
}
