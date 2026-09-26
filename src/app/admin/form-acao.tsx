"use client";

import { useActionState } from "react";
import { mascaraCelular } from "@/lib/mascaras";
import type { Estado } from "./cadastros-actions";

export function FormAcao({
  acao,
  botao,
  className = "",
  children,
}: {
  acao: (estado: Estado, form: FormData) => Promise<Estado>;
  botao: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [estado, action, pendente] = useActionState(acao, {});
  return (
    <form action={action} className={`flex flex-wrap items-end gap-3 ${className}`}>
      {children}
      <button className="btn-primary px-4 py-2 text-[13px]" disabled={pendente}>
        {pendente ? "Salvando..." : botao}
      </button>
      {estado.erro && <p className="w-full text-[13px] text-red-400">{estado.erro}</p>}
      {estado.ok && !pendente && <p className="text-[13px] text-graphite">Salvo</p>}
    </form>
  );
}

export function Campo({
  rotulo,
  className = "",
  telefone,
  defaultValue,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { rotulo: string; telefone?: boolean }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{rotulo}</span>
      <input
        className="input py-2"
        {...(telefone && {
          inputMode: "tel" as const,
          placeholder: "(11) 91234-5678",
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => (e.currentTarget.value = mascaraCelular(e.currentTarget.value)),
        })}
        defaultValue={telefone && typeof defaultValue === "string" ? mascaraCelular(defaultValue) : defaultValue}
        {...props}
      />
    </label>
  );
}
