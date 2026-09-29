"use client";

import { startTransition, useActionState, useState } from "react";
import { ACEITA_FOTO, erroMidia } from "@/lib/midia";
import { enviarParaBlob } from "@/lib/upload";
import type { Estado } from "../cadastros-actions";
import { Campo } from "../form-acao";

export function ProfissionalForm({
  acao,
  botao,
  nome = "",
  telefone = "",
  temFoto = false,
  blob,
  className = "",
}: {
  acao: (estado: Estado, form: FormData) => Promise<Estado>;
  botao: string;
  nome?: string;
  telefone?: string;
  temFoto?: boolean;
  blob: boolean;
  className?: string;
}) {
  const [estado, enviar, salvando] = useActionState(acao, {});
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  async function submeter(f: FormData) {
    setErro("");
    const arquivo = f.get("midia");
    if (arquivo instanceof File && arquivo.size > 0) {
      const e = erroMidia(arquivo.type, arquivo.size, true);
      if (e) return setErro(e);
      if (blob) {
        setEnviando(true);
        try {
          await enviarParaBlob(f, arquivo, "profissionais");
        } catch {
          return setErro("Falha ao enviar a foto.");
        } finally {
          setEnviando(false);
        }
      }
    }
    // Depois do await o React perde a transição do form; reabre para o useActionState
    startTransition(() => enviar(f));
  }

  const ocupado = enviando || salvando;
  return (
    <form action={submeter} className={`flex flex-wrap items-end gap-3 ${className}`}>
      <Campo rotulo="Nome" name="nome" defaultValue={nome} className="min-w-48 flex-1" required />
      <Campo rotulo="WhatsApp" name="telefone" telefone defaultValue={telefone} className="w-48" />
      <label className="block min-w-56 flex-1">
        <span className="label">{temFoto ? "Trocar foto" : "Foto (opcional)"}</span>
        <input name="midia" type="file" accept={ACEITA_FOTO} className="input py-2" />
      </label>
      <button className="btn-primary px-4 py-2 text-[13px]" disabled={ocupado}>
        {enviando ? "Enviando foto..." : salvando ? "Salvando..." : botao}
      </button>
      {(erro || estado.erro) && <p className="w-full text-[13px] text-red-400">{erro || estado.erro}</p>}
      {estado.ok && !ocupado && !erro && <p className="text-[13px] text-graphite">Salvo</p>}
    </form>
  );
}
