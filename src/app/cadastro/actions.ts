"use server";

import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { agendamentos, clientes, emailsAdmin, user as usuarios } from "@/db/schema";
import { cpfValido } from "@/lib/cpf";
import { exigirUsuario } from "@/lib/sessao";
import { normalizarCelular } from "@/lib/celular";

const digitos = (v: string) => v.replace(/\D/g, "");

const Cadastro = z.object({
  // Salvo separado: primeira palavra = nome, resto = sobrenome
  nomeCompleto: z
    .string()
    .transform((v) => v.trim().replace(/\s+/g, " "))
    .refine((v) => /^\S{2,} \S+/.test(v), "Informe nome e sobrenome"),
  email: z.email("E-mail inválido"),
  cpf: z.string().transform(digitos).refine(cpfValido, "CPF inválido"),
  celular: z
    .string()
    .transform((v) => normalizarCelular(v) ?? "")
    .refine(Boolean, "Celular inválido"),
  cep: z.string().transform(digitos).refine((v) => v.length === 8, "CEP inválido"),
  rua: z.string().trim().min(2, "Informe a rua"),
  numero: z.string().trim().min(1, "Informe o número"),
  complemento: z.string().trim().optional(),
  bairro: z.string().trim().min(2, "Informe o bairro"),
  cidade: z.string().trim().min(2, "Informe a cidade"),
  uf: z.string().trim().toUpperCase().length(2, "UF inválida"),
  aviso: z.enum(["email", "whatsapp"]).catch("email"),
});

export type EstadoCadastro = {
  erros?: Record<string, string>;
  valores?: Record<string, string>;
  contaExistente?: boolean;
};

// Outra conta já usa esse e-mail/celular. Se ela nunca terminou o cadastro, é descartada.
async function liberar(campo: "email" | "phoneNumber", valor: string, meuId: string) {
  const [outro] = await db
    .select({ id: usuarios.id, cliente: clientes.userId })
    .from(usuarios)
    .leftJoin(clientes, eq(clientes.userId, usuarios.id))
    .where(and(eq(usuarios[campo], valor), ne(usuarios.id, meuId)));
  if (!outro) return true;
  if (outro.cliente) return false;
  await db.delete(usuarios).where(eq(usuarios.id, outro.id));
  return true;
}

// Cadastro feito pelo barbeiro no balcão passa para a conta que acabou de entrar pelo e-mail
async function assumirCadastro(de: string, para: string) {
  await db.delete(clientes).where(eq(clientes.userId, para));
  await db.update(agendamentos).set({ userId: para }).where(eq(agendamentos.userId, de));
  await db.update(clientes).set({ userId: para }).where(eq(clientes.userId, de));
  await db.delete(usuarios).where(eq(usuarios.id, de));
}

export async function salvarCadastro(_: EstadoCadastro, form: FormData): Promise<EstadoCadastro> {
  const user = await exigirUsuario();
  const valores = Object.fromEntries(form) as Record<string, string>;
  const parsed = Cadastro.safeParse(valores);
  if (!parsed.success) {
    const erros: Record<string, string> = {};
    for (const i of parsed.error.issues) erros[String(i.path[0])] ??= i.message;
    return { erros, valores };
  }

  const { nomeCompleto, ...resto } = parsed.data;
  const [nome, ...sobrenome] = nomeCompleto.split(" ");
  const dados = { ...resto, nome, sobrenome: sobrenome.join(" ") };
  // E-mail confirmado no login é o da conta; o do formulário é ignorado
  if (user.emailVerified && !user.email.endsWith(".local")) dados.email = user.email;

  // E-mail de admin só vale para quem entrou com ele confirmado (código no e-mail ou Google)
  const [emailAdmin] = await db
    .select()
    .from(emailsAdmin)
    .where(eq(emailsAdmin.email, dados.email.toLowerCase()));
  const admin = emailAdmin && user.emailVerified && user.email.toLowerCase() === dados.email.toLowerCase();
  if (emailAdmin && !admin) return { erros: { email: "Entre com este e-mail para usá-lo no cadastro." }, valores };

  // Um CPF = uma conta. O cadastro do balcão (sem e-mail) é assumido se o celular confere.
  const [dono] = await db
    .select({ userId: clientes.userId, celular: clientes.celular, email: usuarios.email })
    .from(clientes)
    .innerJoin(usuarios, eq(usuarios.id, clientes.userId))
    .where(eq(clientes.cpf, dados.cpf));
  if (dono && dono.userId !== user.id) {
    if (!dono.email.endsWith("@balcao.local"))
      return { erros: { cpf: "Esse CPF já tem uma conta." }, valores, contaExistente: true };
    if (dono.celular !== dados.celular)
      return { erros: { celular: "Informe o celular que você deu na barbearia, ou fale com ela." }, valores };
    await assumirCadastro(dono.userId, user.id);
  }
  if (!(await liberar("email", dados.email, user.id)))
    return { erros: { email: "E-mail já usado por outra conta." }, valores, contaExistente: true };
  if (!(await liberar("phoneNumber", dados.celular, user.id)))
    return { erros: { celular: "Celular já usado por outra conta." }, valores, contaExistente: true };

  // E-mail e celular do cadastro passam a valer para login e recuperação de acesso
  const celularAtual = (user as { phoneNumber?: string | null }).phoneNumber;
  await db
    .update(usuarios)
    .set({
      name: nomeCompleto,
      email: dados.email,
      ...(celularAtual !== dados.celular && { phoneNumber: dados.celular, phoneNumberVerified: false }),
      updatedAt: new Date(),
    })
    .where(eq(usuarios.id, user.id));

  try {
    await db
      .insert(clientes)
      .values({
        userId: user.id,
        ...dados,
        tipo: admin ? "admin" : "cliente",
      })
      .onConflictDoUpdate({ target: clientes.userId, set: admin ? { ...dados, tipo: "admin" } : dados });
  } catch (e) {
    const err = e as { code?: string; cause?: { code?: string } };
    if (err.code === "23505" || err.cause?.code === "23505") return { erros: { cpf: "Esse CPF já tem uma conta." }, valores, contaExistente: true };
    throw e;
  }
  redirect("/");
}
