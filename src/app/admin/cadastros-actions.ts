"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { db } from "@/db";
import { estilos, profissionais, servicos } from "@/db/schema";
import { exigirAdmin } from "@/lib/sessao";
import { ehVideo, erroMidia, TIPOS_MIDIA, type PastaMidia } from "@/lib/midia";
import { normalizarCelular } from "@/lib/sms";

export type Estado = { erro?: string; ok?: boolean };

const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

const Servico = z.object({
  nome: z.string().trim().min(2, "Informe o nome do serviço"),
  duracaoMin: z.coerce.number().int().min(5, "Duração mínima de 5 min").max(240, "Duração máxima de 240 min"),
  // "45", "45,00" ou "45.00"
  preco: z
    .string()
    .transform((v) => Math.round(Number(v.replace(/\s|R\$/g, "").replace(",", ".")) * 100))
    .refine((v) => Number.isFinite(v) && v >= 0, "Preço inválido"),
  permiteEstilo: z.boolean(),
});

function lerServico(f: FormData) {
  return Servico.safeParse({
    nome: texto(f, "nome"),
    duracaoMin: texto(f, "duracaoMin"),
    preco: texto(f, "preco"),
    permiteEstilo: f.get("permiteEstilo") === "on",
  });
}

function atualizar(...paginas: string[]) {
  for (const p of paginas) revalidatePath(p);
}

// Serviços

export async function criarServico(_: Estado, f: FormData): Promise<Estado> {
  await exigirAdmin();
  const r = lerServico(f);
  if (!r.success) return { erro: r.error.issues[0].message };
  const { preco, ...dados } = r.data;
  await db.insert(servicos).values({ ...dados, precoCentavos: preco });
  atualizar("/admin/servicos", "/agendar");
  return { ok: true };
}

export async function editarServico(id: number, _: Estado, f: FormData): Promise<Estado> {
  await exigirAdmin();
  const r = lerServico(f);
  if (!r.success) return { erro: r.error.issues[0].message };
  const { preco, ...dados } = r.data;
  await db.update(servicos).set({ ...dados, precoCentavos: preco }).where(eq(servicos.id, id));
  atualizar("/admin/servicos", "/agendar");
  return { ok: true };
}

export async function alternarServico(id: number, ativo: boolean) {
  await exigirAdmin();
  await db.update(servicos).set({ ativo }).where(eq(servicos.id, id));
  atualizar("/admin/servicos", "/agendar");
}

// Profissionais

// Telefone opcional; se preenchido precisa ser um celular válido
function lerProfissional(f: FormData) {
  const nome = texto(f, "nome");
  if (nome.length < 2) return { erro: "Informe o nome" };
  const bruto = texto(f, "telefone");
  const telefone = bruto ? normalizarCelular(bruto) : null;
  if (bruto && !telefone) return { erro: "WhatsApp inválido (DDD + número)" };
  return { dados: { nome, telefone } };
}

export async function criarProfissional(_: Estado, f: FormData): Promise<Estado> {
  await exigirAdmin();
  const r = lerProfissional(f);
  if (!r.dados) return { erro: r.erro };
  const m = await lerMidia(f, "profissionais");
  if ("erro" in m) return { erro: m.erro };
  await db.insert(profissionais).values({ ...r.dados, fotoUrl: m.url });
  atualizar("/admin/profissionais", "/agendar");
  return { ok: true };
}

// Sem arquivo novo, a foto atual continua
export async function editarProfissional(id: number, _: Estado, f: FormData): Promise<Estado> {
  await exigirAdmin();
  const r = lerProfissional(f);
  if (!r.dados) return { erro: r.erro };
  const m = await lerMidia(f, "profissionais");
  if ("erro" in m) return { erro: m.erro };
  await db
    .update(profissionais)
    .set({ ...r.dados, ...(m.url && { fotoUrl: m.url }) })
    .where(eq(profissionais.id, id));
  atualizar("/admin/profissionais", "/admin", "/agendar");
  return { ok: true };
}

export async function alternarProfissional(id: number, ativo: boolean) {
  await exigirAdmin();
  await db.update(profissionais).set({ ativo }).where(eq(profissionais.id, id));
  atualizar("/admin/profissionais", "/agendar");
}

// Portfólio

// Vercel Blob em produção; sem token, salva em public/<pasta> (só funciona local)
async function salvarArquivo(arquivo: File, pasta: PastaMidia) {
  const ext = TIPOS_MIDIA[arquivo.type as keyof typeof TIPOS_MIDIA];
  const nome = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`${pasta}/${nome}`, arquivo, { access: "public", contentType: arquivo.type });
    return blob.url;
  }
  const dir = path.join(process.cwd(), "public", pasta);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, nome), Buffer.from(await arquivo.arrayBuffer()));
  return `/${pasta}/${nome}`;
}

// Mídia vem como arquivo (local) ou como URL já enviada pelo navegador ao Vercel Blob
async function lerMidia(f: FormData, pasta: PastaMidia): Promise<{ url: string | null } | { erro: string }> {
  const soFoto = pasta === "profissionais";
  const url = texto(f, "midiaUrl");
  if (url) {
    if (!/^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//.test(url)) return { erro: "Arquivo inválido" };
    if (soFoto && ehVideo(url)) return { erro: "Use uma foto (JPG, PNG, WEBP)" };
    return { url };
  }
  const arquivo = f.get("midia");
  if (!(arquivo instanceof File) || arquivo.size === 0) return { url: null };
  const erro = erroMidia(arquivo.type, arquivo.size, soFoto);
  if (erro) return { erro };
  return { url: await salvarArquivo(arquivo, pasta) };
}

export async function criarEstilo(_: Estado, f: FormData): Promise<Estado> {
  await exigirAdmin();
  const nome = texto(f, "nome");
  if (nome.length < 2) return { erro: "Informe o nome do estilo" };
  const m = await lerMidia(f, "portfolio");
  if ("erro" in m) return { erro: m.erro };
  await db.insert(estilos).values({ nome, imagemUrl: m.url });
  atualizar("/admin/portfolio", "/portfolio", "/agendar");
  return { ok: true };
}

export async function editarEstilo(id: number, _: Estado, f: FormData): Promise<Estado> {
  await exigirAdmin();
  const nome = texto(f, "nome");
  if (nome.length < 2) return { erro: "Informe o nome do estilo" };
  const m = await lerMidia(f, "portfolio");
  if ("erro" in m) return { erro: m.erro };
  await db
    .update(estilos)
    .set({ nome, ...(m.url && { imagemUrl: m.url }) })
    .where(eq(estilos.id, id));
  atualizar("/admin/portfolio", "/portfolio", "/agendar");
  return { ok: true };
}

export async function alternarEstilo(id: number, ativo: boolean) {
  await exigirAdmin();
  await db.update(estilos).set({ ativo }).where(eq(estilos.id, id));
  atualizar("/admin/portfolio", "/portfolio", "/agendar");
}
