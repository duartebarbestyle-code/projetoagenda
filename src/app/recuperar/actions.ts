"use server";

import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clientes, user } from "@/db/schema";
import { auth } from "@/lib/auth";

export type Canal = "sms" | "email";

async function contaPorCpf(cpf: string) {
  const [c] = await db
    .select({ email: user.email, celular: user.phoneNumber })
    .from(clientes)
    .innerJoin(user, eq(user.id, clientes.userId))
    .where(eq(clientes.cpf, cpf.replace(/\D/g, "")));
  return c ?? null;
}

const mascararCelular = (c: string) => `(${c.slice(3, 5)}) *****-${c.slice(-4)}`;
const mascararEmail = (e: string) => e.replace(/^(.{2})[^@]*/, "$1***");

export async function buscarConta(cpf: string) {
  const c = await contaPorCpf(cpf);
  if (!c) return null;
  return {
    celular: c.celular ? mascararCelular(c.celular) : null,
    email: c.email.endsWith(".local") ? null : mascararEmail(c.email),
  };
}

export async function enviarCodigo(cpf: string, canal: Canal) {
  const c = await contaPorCpf(cpf);
  if (!c) return false;
  const h = await headers();
  if (canal === "sms" && c.celular) {
    await auth.api.sendPhoneNumberOTP({ body: { phoneNumber: c.celular }, headers: h });
  } else if (canal === "email" && !c.email.endsWith(".local")) {
    await auth.api.sendVerificationOTP({ body: { email: c.email, type: "sign-in" }, headers: h });
  } else return false;
  return true;
}

export async function confirmarCodigo(cpf: string, canal: Canal, codigo: string) {
  const c = await contaPorCpf(cpf);
  if (!c) return false;
  const h = await headers();
  try {
    if (canal === "sms" && c.celular)
      await auth.api.verifyPhoneNumber({ body: { phoneNumber: c.celular, code: codigo }, headers: h });
    else await auth.api.signInEmailOTP({ body: { email: c.email, otp: codigo }, headers: h });
    return true;
  } catch {
    return false;
  }
}
