"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Wizard } from "@/app/agendar/wizard";
import { cancelarPeloAdmin, editarAgendamento, horariosAdmin, profissionaisAdmin } from "../../agendamento-actions";

type Props = Omit<React.ComponentProps<typeof Wizard>, "acoes" | "destino" | "textoConfirmar"> & { id: number };

export function EditarAgendamento({ id, ...props }: Props) {
  const router = useRouter();
  const [cancelando, iniciar] = useTransition();
  const acoes = useMemo(
    () => ({
      carregarHorarios: horariosAdmin.bind(null, id),
      carregarProfissionais: profissionaisAdmin.bind(null, id),
      confirmarAgendamento: editarAgendamento.bind(null, id),
    }),
    [id],
  );

  function cancelar() {
    if (!confirm("Cancelar este agendamento? O cliente recebe um SMS avisando.")) return;
    iniciar(async () => {
      await cancelarPeloAdmin(id);
      router.push(`/admin?dia=${props.inicial?.data ?? ""}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-10">
      <Wizard {...props} acoes={acoes} destino={(d) => `/admin?dia=${d}`} textoConfirmar="Salvar alterações" />
      <div className="border-t border-steel pt-6">
        <button className="btn-ghost hover:border-red-400 hover:text-red-400" disabled={cancelando} onClick={cancelar}>
          {cancelando ? "Cancelando..." : "Cancelar agendamento"}
        </button>
      </div>
    </div>
  );
}
