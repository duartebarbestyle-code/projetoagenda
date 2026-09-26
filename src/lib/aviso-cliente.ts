import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clientes } from "@/db/schema";
import { BARBEARIA } from "./config";
import { enviarEmail } from "./email";
import { enviarSms } from "./sms";

// Confirmação, alteração, cancelamento e lembrete: pelo canal que o cliente escolheu no cadastro.
// Sem e-mail cadastrado, vai por SMS. Falha no envio nunca quebra o fluxo.
export async function avisarCliente(userId: string, assunto: string, texto: string) {
  try {
    const [c] = await db
      .select({ celular: clientes.celular, email: clientes.email, aviso: clientes.aviso })
      .from(clientes)
      .where(eq(clientes.userId, userId));
    if (!c) return;
    if (c.aviso === "email" && c.email) await enviarEmail(c.email, `${BARBEARIA}: ${assunto}`, texto[0].toUpperCase() + texto.slice(1));
    else await enviarSms(c.celular, `${BARBEARIA}: ${texto}`);
  } catch (e) {
    console.error("Falha no aviso ao cliente", e);
  }
}
