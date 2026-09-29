"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { mascaraCelular, mascaraCep, mascaraCpf } from "@/lib/mascaras";
import { salvarCadastro, type EstadoCadastro } from "./actions";

type Inicial = Partial<Record<string, string | null>>;

export function CadastroForm({ inicial, emailFixo }: { inicial: Inicial; emailFixo: boolean }) {
  const [estado, acao, pendente] = useActionState<EstadoCadastro, FormData>(salvarCadastro, {});

  const [avisoCep, setAvisoCep] = useState("");

  // Preenche endereço pelo CEP (ViaCEP) assim que os 8 dígitos são digitados
  async function buscarCep(input: HTMLInputElement) {
    const cep = input.value.replace(/\D/g, "");
    if (cep.length !== 8 || !input.form || cep === input.dataset.buscado) return;
    input.dataset.buscado = cep;
    setAvisoCep("Buscando endereço...");
    const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`).then((r) => r.json()).catch(() => null);
    if (!r || r.erro) {
      setAvisoCep(r ? "CEP não encontrado. Preencha o endereço." : "Não foi possível buscar o CEP.");
      input.dataset.buscado = "";
      return;
    }
    setAvisoCep("");
    const f = input.form.elements as unknown as Record<string, HTMLInputElement>;
    const preencher = (campo: string, valor?: string) => valor && (f[campo].value = valor);
    preencher("rua", r.logradouro);
    preencher("bairro", r.bairro);
    preencher("cidade", r.localidade);
    preencher("uf", r.uf);
    (r.logradouro ? f.numero : f.rua).focus();
  }

  const campo = (
    nome: string,
    rotulo: string,
    {
      className,
      mascara,
      onChange,
      ...props
    }: React.InputHTMLAttributes<HTMLInputElement> & { mascara?: (v: string) => string } = {},
  ) => {
    const valor = estado.valores?.[nome] ?? inicial[nome] ?? "";
    return (
    <div className={className}>
      <label className="label" htmlFor={nome}>{rotulo}</label>
      <input
        id={nome}
        name={nome}
        className="input"
        defaultValue={mascara ? mascara(valor) : valor}
        onChange={(e) => {
          if (mascara) e.currentTarget.value = mascara(e.currentTarget.value);
          onChange?.(e);
        }}
        {...props}
      />
      {estado.erros?.[nome] && <p className="mt-1 text-[13px] text-red-400">{estado.erros[nome]}</p>}
    </div>
    );
  };

  return (
    <form action={acao} className="card grid grid-cols-6 gap-4">
      {campo("nomeCompleto", "Nome completo", { className: "col-span-6", autoComplete: "name" })}
      {campo("email", "E-mail", { className: "col-span-6", type: "email", autoComplete: "email", readOnly: emailFixo })}
      {campo("cpf", "CPF", { className: "col-span-3", inputMode: "numeric", placeholder: "000.000.000-00", mascara: mascaraCpf })}
      {campo("celular", "Celular (WhatsApp)", {
        className: "col-span-3",
        inputMode: "tel",
        placeholder: "(11) 91234-5678",
        mascara: mascaraCelular,
      })}
      {campo("cep", "CEP", {
        className: "col-span-2",
        inputMode: "numeric",
        placeholder: "00000-000",
        mascara: mascaraCep,
        onChange: (e) => buscarCep(e.currentTarget),
      })}
      {campo("rua", "Rua", { className: "col-span-4" })}
      {avisoCep && <p className="col-span-6 -mt-2 text-[13px] text-graphite">{avisoCep}</p>}
      {campo("numero", "Número", { className: "col-span-2" })}
      {campo("complemento", "Complemento", { className: "col-span-4" })}
      {campo("bairro", "Bairro", { className: "col-span-3" })}
      {campo("cidade", "Cidade", { className: "col-span-2" })}
      {campo("uf", "UF", { className: "col-span-1", maxLength: 2 })}

      <fieldset className="col-span-6">
        <legend className="label">Receber avisos de agendamento por</legend>
        <div className="flex gap-3">
          {(
            [
              ["email", "E-mail"],
              ["whatsapp", "WhatsApp"],
            ] as const
          ).map(([valor, rotulo]) => (
            <label key={valor} className="option flex cursor-pointer items-center gap-2 py-2 has-[:checked]:border-signal has-[:checked]:bg-cobalt/20">
              <input
                type="radio"
                name="aviso"
                value={valor}
                defaultChecked={(estado.valores?.aviso ?? inicial.aviso ?? "email") === valor}
                className="accent-cobalt"
              />
              {rotulo}
            </label>
          ))}
        </div>
      </fieldset>

      {estado.contaExistente && (
        <p className="col-span-6 rounded-md border border-cobalt bg-cobalt/15 px-4 py-3 text-[15px]">
          Você já tem cadastro. <Link href="/recuperar" className="font-semibold text-signal">Recuperar acesso</Link>
        </p>
      )}

      <button className="btn-primary col-span-6 mt-2" disabled={pendente}>
        {pendente ? "Salvando..." : "Salvar e continuar"}
      </button>
    </form>
  );
}
