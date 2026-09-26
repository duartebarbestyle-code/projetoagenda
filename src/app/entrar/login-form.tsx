"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { mascaraCelular } from "@/lib/mascaras";

function e164(valor: string) {
  const d = valor.replace(/\D/g, "");
  return d.length === 11 ? `+55${d}` : null;
}

export function LoginForm() {
  const router = useRouter();
  const [celular, setCelular] = useState("");
  const [codigo, setCodigo] = useState("");
  const [etapa, setEtapa] = useState<"celular" | "codigo">("celular");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function google() {
    await authClient.signIn.social({ provider: "google", callbackURL: "/" });
  }

  async function enviarCodigo(e: React.FormEvent) {
    e.preventDefault();
    const numero = e164(celular);
    if (!numero) return setErro("Informe DDD + número (11 dígitos).");
    setErro("");
    setCarregando(true);
    const { error } = await authClient.phoneNumber.sendOtp({ phoneNumber: numero });
    setCarregando(false);
    if (error) return setErro("Não foi possível enviar o código.");
    setEtapa("codigo");
  }

  async function verificar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    const { error } = await authClient.phoneNumber.verify({ phoneNumber: e164(celular)!, code: codigo });
    setCarregando(false);
    if (error) return setErro("Código inválido ou expirado.");
    router.push("/");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <button onClick={google} className="btn-ghost w-full gap-2">
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        Entrar com Google
      </button>

      <div className="flex items-center gap-3 text-[13px] text-ash">
        <span className="h-px flex-1 bg-steel" /> ou <span className="h-px flex-1 bg-steel" />
      </div>

      {etapa === "celular" ? (
        <form onSubmit={enviarCodigo} className="space-y-3">
          <label className="label" htmlFor="celular">Celular</label>
          <input
            id="celular"
            className="input"
            inputMode="tel"
            placeholder="(11) 91234-5678"
            value={celular}
            onChange={(e) => setCelular(mascaraCelular(e.target.value))}
          />
          <button className="btn-primary w-full" disabled={carregando}>Receber código por SMS</button>
        </form>
      ) : (
        <form onSubmit={verificar} className="space-y-3">
          <label className="label" htmlFor="codigo">Código enviado para {celular}</label>
          <input
            id="codigo"
            className="input tracking-[0.3em]"
            inputMode="numeric"
            maxLength={6}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
          />
          <button className="btn-primary w-full" disabled={carregando || codigo.length < 6}>Entrar</button>
          <button type="button" className="text-[13px] text-graphite hover:text-signal" onClick={() => setEtapa("celular")}>
            Trocar número
          </button>
        </form>
      )}

      {erro && <p className="text-[13px] text-red-400">{erro}</p>}
    </div>
  );
}
