import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { BARBEARIA } from "@/lib/config";
import { ehAdmin } from "@/lib/sessao";
import { AdminNav } from "./admin/admin-nav";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: `${BARBEARIA} — Agendamento`,
  description: "Agende corte, barba e sobrancelha online.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const admin = await ehAdmin();
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <header className="border-b border-steel bg-onyx">
          <nav className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-4 px-4">
            <Link href="/" className="flex shrink-0 items-center gap-2 text-lg font-bold tracking-tight">
              {BARBEARIA}
              {admin && (
                <span className="rounded-md bg-cobalt px-2 py-0.5 text-[13px] font-semibold text-white">Painel</span>
              )}
            </Link>
            {admin ? (
              <AdminNav />
            ) : (
              <div className="flex gap-5 text-[15px] font-medium text-graphite">
                <Link href="/agendar" className="hover:text-signal">Agendar</Link>
                <Link href="/portfolio" className="hover:text-signal">Portfólio</Link>
                <Link href="/meus-agendamentos" className="hover:text-signal">Meus horários</Link>
              </div>
            )}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">{children}</main>
      </body>
    </html>
  );
}
