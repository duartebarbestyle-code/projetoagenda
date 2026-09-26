import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { ehAdmin } from "@/lib/sessao";
import { MAX_VIDEO, TIPOS_MIDIA } from "@/lib/midia";

// Gera o token para o navegador enviar foto/vídeo direto ao Vercel Blob (sem o limite de 4,5 MB da função)
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const r = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        if (!(await ehAdmin())) throw new Error("Não autorizado");
        return { allowedContentTypes: Object.keys(TIPOS_MIDIA), maximumSizeInBytes: MAX_VIDEO, addRandomSuffix: true };
      },
    });
    return Response.json(r);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
