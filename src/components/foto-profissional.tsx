export type Profissional = { id: number; nome: string; fotoUrl?: string | null };

const iniciais = (nome: string) =>
  nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

// Foto redonda ou, sem foto, as iniciais do nome
export function FotoProfissional({ profissional, className = "size-20" }: { profissional: Profissional; className?: string }) {
  const url = profissional.fotoUrl;
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={profissional.nome} className={`${className} shrink-0 rounded-full object-cover`} />
  ) : (
    <div
      aria-hidden
      className={`${className} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-steel to-onyx text-[22px] font-bold text-graphite`}
    >
      {iniciais(profissional.nome)}
    </div>
  );
}
