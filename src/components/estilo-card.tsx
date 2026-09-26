import { ehVideo } from "@/lib/midia";

export type Estilo = { id: number; nome: string; imagemUrl: string | null };

// Foto, vídeo (sem som, em loop) ou, sem mídia, um bloco com a inicial do estilo
export function EstiloImagem({ estilo }: { estilo: Estilo }) {
  const url = estilo.imagemUrl;
  if (url && ehVideo(url))
    return (
      <video
        src={url}
        className="aspect-square w-full rounded-md object-cover"
        autoPlay
        muted
        loop
        playsInline
        aria-label={estilo.nome}
      />
    );
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={estilo.nome} className="aspect-square w-full rounded-md object-cover" />
  ) : (
    <div className="flex aspect-square w-full items-center justify-center rounded-md bg-gradient-to-br from-steel to-onyx text-[34px] font-bold text-graphite">
      {estilo.nome[0]}
    </div>
  );
}
