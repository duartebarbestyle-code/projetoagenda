"use client";

import { useTransition } from "react";
import { cancelarPeloAdmin } from "./agendamento-actions";

export function BotaoCancelar({ id }: { id: number }) {
  const [pendente, iniciar] = useTransition();
  return (
    <button
      className="text-graphite hover:text-red-400 disabled:opacity-40"
      disabled={pendente}
      onClick={() => confirm("Cancelar este agendamento? O cliente recebe um aviso por e-mail ou WhatsApp.") && iniciar(() => cancelarPeloAdmin(id))}
    >
      {pendente ? "Cancelando..." : "Cancelar"}
    </button>
  );
}
