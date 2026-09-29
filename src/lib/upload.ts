import { upload } from "@vercel/blob/client";
import type { PastaMidia } from "./midia";

// Com Vercel Blob, o arquivo sobe direto do navegador e o formulário manda só a URL (campo midiaUrl)
export async function enviarParaBlob(f: FormData, arquivo: File, pasta: PastaMidia) {
  const r = await upload(`${pasta}/${arquivo.name}`, arquivo, { access: "public", handleUploadUrl: "/api/upload" });
  f.set("midiaUrl", r.url);
  f.delete("midia");
}
