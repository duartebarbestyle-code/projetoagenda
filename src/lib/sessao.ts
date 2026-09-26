import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "./auth";
import { db } from "@/db";
import { clientes } from "@/db/schema";

export async function sessaoAtual() {
  return auth.api.getSession({ headers: await headers() });
}

export async function exigirUsuario() {
  const s = await sessaoAtual();
  if (!s) redirect("/entrar");
  return s.user;
}

// Usuário logado e com cadastro completo
export async function exigirCliente() {
  const user = await exigirUsuario();
  const [cliente] = await db.select().from(clientes).where(eq(clientes.userId, user.id));
  // Sem e-mail = cadastro rápido feito no balcão; o cliente completa no primeiro acesso
  if (!cliente || !cliente.email) redirect("/cadastro");
  return { user, cliente };
}

// Telas do cliente: admin está em outro modo e vai para o painel
export async function exigirClienteComum() {
  const r = await exigirCliente();
  if (r.cliente.tipo === "admin") redirect("/admin");
  return r;
}

// Barbeiro/dono: cadastro com tipo = 'admin'
export async function exigirAdmin() {
  const r = await exigirCliente();
  if (r.cliente.tipo !== "admin") notFound();
  return r;
}

export async function ehAdmin() {
  const s = await sessaoAtual();
  if (!s) return false;
  const [c] = await db.select({ tipo: clientes.tipo }).from(clientes).where(eq(clientes.userId, s.user.id));
  return c?.tipo === "admin";
}
