// Regras de funcionamento da barbearia
export const BARBEARIA = "Barbearia";

export const FUSO = "America/Sao_Paulo";
export const OFFSET = "-03:00"; // Brasil sem horário de verão

// 0 = domingo ... 6 = sábado. null = fechado
export const EXPEDIENTE: Record<number, { abre: string; fecha: string } | null> = {
  0: null,
  1: { abre: "09:00", fecha: "19:00" },
  2: { abre: "09:00", fecha: "19:00" },
  3: { abre: "09:00", fecha: "19:00" },
  4: { abre: "09:00", fecha: "19:00" },
  5: { abre: "09:00", fecha: "19:00" },
  6: { abre: "09:00", fecha: "17:00" },
};

export const INTERVALO_SLOT_MIN = 30;
export const DIAS_A_FRENTE = 14;
