// Aceita "(11) 91234-5678" ou "+5511912345678" e devolve E.164
export function normalizarCelular(valor: string) {
  const d = valor.replace(/\D/g, "");
  if (d.length === 13 && d.startsWith("55")) return `+${d}`;
  if (d.length === 11) return `+55${d}`;
  return null;
}
