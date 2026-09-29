"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ABAS = [
  { href: "/admin", rotulo: "Agenda" },
  { href: "/admin/clientes", rotulo: "Clientes" },
  { href: "/admin/servicos", rotulo: "Serviços" },
  { href: "/admin/profissionais", rotulo: "Profissionais" },
  { href: "/admin/portfolio", rotulo: "Portfólio" },
];

// Menu do modo admin (fica no header no lugar do menu do cliente)
export function AdminNav() {
  const atual = usePathname();
  return (
    <div className="flex gap-5 overflow-x-auto text-[15px] font-medium">
      {ABAS.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className={`shrink-0 ${atual === a.href ? "text-signal" : "text-graphite hover:text-chalk"}`}
        >
          {a.rotulo}
        </Link>
      ))}
    </div>
  );
}
