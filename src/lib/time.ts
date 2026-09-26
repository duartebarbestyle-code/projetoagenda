import { FUSO, OFFSET } from "./config";

// "YYYY-MM-DD" no fuso da barbearia
export function dataLocal(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(d);
}

export function somarDias(dataISO: string, dias: number) {
  const d = new Date(`${dataISO}T12:00:00${OFFSET}`);
  d.setUTCDate(d.getUTCDate() + dias);
  return dataLocal(d);
}

export function diaDaSemana(dataISO: string) {
  return new Date(`${dataISO}T12:00:00${OFFSET}`).getUTCDay();
}

export function paraDate(dataISO: string, hm: string) {
  return new Date(`${dataISO}T${hm}:00${OFFSET}`);
}

export function minutos(hm: string) {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

export function hm(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

export const fmtHora = (d: Date) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" }).format(d);

export const fmtData = (d: Date) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, weekday: "short", day: "2-digit", month: "2-digit" }).format(d);

export const fmtPreco = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
