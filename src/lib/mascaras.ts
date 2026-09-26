// Formata enquanto digita (aceita colar tudo junto ou já formatado)
const so = (v: string, max: number) => v.replace(/\D/g, "").slice(0, max);

export function mascaraCpf(v: string) {
  const d = so(v, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}

export function mascaraCelular(v: string) {
  let d = v.replace(/\D/g, "");
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2); // +55
  d = d.slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function mascaraCep(v: string) {
  return so(v, 8).replace(/^(\d{5})(\d)/, "$1-$2");
}
