"use client";

import { usePathname } from "next/navigation";

// Páginas sem header e sem a coluna estreita (o conteúdo ocupa a largura toda)
const TELA_CHEIA = ["/entrar"];

export function Moldura({ header, children }: { header: React.ReactNode; children: React.ReactNode }) {
  const cheia = TELA_CHEIA.includes(usePathname());
  return (
    <>
      {!cheia && header}
      <main className={cheia ? "w-full flex-1" : "mx-auto w-full max-w-3xl flex-1 px-4 py-10"}>{children}</main>
    </>
  );
}
