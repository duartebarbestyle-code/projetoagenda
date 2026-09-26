"use client";

import { startTransition, useActionState, useState } from "react";
import { upload } from "@vercel/blob/client";
import { ACEITA_MIDIA, erroMidia, MAX_SEGUNDOS } from "@/lib/midia";
import type { Estado } from "../cadastros-actions";

// Duração lida pelo próprio navegador
function duracao(arquivo: File) {
  return new Promise<number>((resolve) => {
    const v = document.createElement("video");
    const url = URL.createObjectURL(arquivo);
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(v.duration);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(NaN);
    };
    v.src = url;
  });
}

// Com Vercel Blob, o arquivo sobe direto do navegador e o formulário manda só a URL
export function EstiloForm({
  acao,
  botao,
  nome = "",
  temMidia = false,
  blob,
}: {
  acao: (estado: Estado, form: FormData) => Promise<Estado>;
  botao: string;
  nome?: string;
  temMidia?: boolean;
  blob: boolean;
}) {
  const [estado, enviar, salvando] = useActionState(acao, {});
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  async function submeter(f: FormData) {
    setErro("");
    const arquivo = f.get("midia");
    if (arquivo instanceof File && arquivo.size > 0) {
      const e = erroMidia(arquivo.type, arquivo.size);
      if (e) return setErro(e);
      if (arquivo.type.startsWith("video/")) {
        const s = await duracao(arquivo);
        if (Number.isNaN(s)) return setErro("Não foi possível ler o vídeo. Tente MP4.");
        if (s > MAX_SEGUNDOS + 0.5) return setErro(`Vídeo com ${Math.round(s)} s. O máximo é ${MAX_SEGUNDOS} segundos.`);
      }
      if (blob) {
        setEnviando(true);
        try {
          const r = await upload(`portfolio/${arquivo.name}`, arquivo, { access: "public", handleUploadUrl: "/api/upload" });
          f.set("midiaUrl", r.url);
          f.delete("midia");
        } catch {
          return setErro("Falha ao enviar o arquivo.");
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
    <form action={submeter} className="flex flex-wrap items-end gap-3">
      <label className="block min-w-48 flex-1">
        <span className="label">Nome</span>
        <input name="nome" defaultValue={nome} className="input py-2" required />
      </label>
      <label className="block min-w-56 flex-1">
        <span className="label">{temMidia ? "Trocar foto ou vídeo" : `Foto ou vídeo (até ${MAX_SEGUNDOS} s)`}</span>
        <input name="midia" type="file" accept={ACEITA_MIDIA} className="input py-2" />
      </label>
      <button className="btn-primary px-4 py-2 text-[13px]" disabled={ocupado}>
        {enviando ? "Enviando arquivo..." : salvando ? "Salvando..." : botao}
      </button>
      {(erro || estado.erro) && <p className="w-full text-[13px] text-red-400">{erro || estado.erro}</p>}
      {estado.ok && !ocupado && !erro && <p className="text-[13px] text-graphite">Salvo</p>}
    </form>
  );
}
