// Fotos e vídeos do portfólio; fotos dos profissionais
export type PastaMidia = "portfolio" | "profissionais";

export const TIPOS_MIDIA = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
} as const;

export const ACEITA_MIDIA = Object.keys(TIPOS_MIDIA).join(",");
export const ACEITA_FOTO = Object.keys(TIPOS_MIDIA).filter((t) => t.startsWith("image/")).join(",");
export const MAX_FOTO = 5 * 1024 * 1024;
export const MAX_VIDEO = 50 * 1024 * 1024;
export const MAX_SEGUNDOS = 20;

export const ehVideo = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url);

export function erroMidia(tipo: string, tamanho: number, soFoto = false) {
  const video = tipo.startsWith("video/");
  if (soFoto && (video || !(tipo in TIPOS_MIDIA))) return "Use uma foto (JPG, PNG, WEBP)";
  if (!(tipo in TIPOS_MIDIA)) return "Use foto (JPG, PNG, WEBP) ou vídeo (MP4, WEBM, MOV)";
  if (tamanho > (video ? MAX_VIDEO : MAX_FOTO)) return video ? "Vídeo maior que 50 MB" : "Foto maior que 5 MB";
  return null;
}
