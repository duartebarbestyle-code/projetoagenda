"use server";

import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clientes, user } from "@/db/schema";
import { auth } from "@/lib/auth";

// Para quem esqueceu com qual e-mail se cadastrou: acha pelo CPF e manda o código para ele
async function emailPorCpf(cpf: string) {
  const [c] = await db
    .select({ email: user.email })
    .from(clientes)
    .innerJoin(user, eq(user.id, clientes.userId))
    .where(eq(clientes.cpf, cpf.replace(/\D/g, "")));
  if (!c) return undefined;
  // Cadastro feito no balcão ainda não tem e-mail
  return c.email.endsWith(".local") ? null : c.email;
}

const mascararEmail = (e: string) => e.replace(/^(.{2})[^@]*/, "$1***");

export async function buscarConta(cpf: string) {
  const email = await emailPorCpf(cpf);
  if (email === undefined) return null;
  return { email: email && mascararEmail(email) };
}

export async function enviarCodigo(cpf: string) {
  const email = await emailPorCpf(cpf);
  if (!email) return false;
  await auth.api.sendVerificationOTP({ body: { email, type: "sign-in" }, headers: await headers() });
  return true;
}

export async function confirmarCodigo(cpf: string, codigo: string) {
  const email = await emailPorCpf(cpf);
  if (!email) return false;
  try {
    await auth.api.signInEmailOTP({ body: { email, otp: codigo }, headers: await headers() });
    return true;
  } catch {
    return false;
  }
}
