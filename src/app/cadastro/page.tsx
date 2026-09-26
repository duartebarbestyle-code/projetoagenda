import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clientes } from "@/db/schema";
import { exigirUsuario } from "@/lib/sessao";
import { CadastroForm } from "./cadastro-form";

export default async function Cadastro() {
  const user = await exigirUsuario();
  const [cliente] = await db.select().from(clientes).where(eq(clientes.userId, user.id));
  const celularLogin = (user as { phoneNumber?: string | null }).phoneNumber ?? "";

  return (
    <div className="mx-auto max-w-xl">
      <p className="eyebrow">Primeiro acesso</p>
      <h1 className="mt-2 mb-8 text-[34px] font-bold leading-tight tracking-tight">Complete seu cadastro</h1>
      <CadastroForm
        inicial={
          cliente ? { ...cliente, nomeCompleto: `${cliente.nome} ${cliente.sobrenome}`, createdAt: null } : {
            nomeCompleto: user.name.startsWith("+") ? "" : user.name,
            email: user.email.endsWith(".local") ? "" : user.email,
            celular: celularLogin,
          }
        }
        celularFixo={Boolean(celularLogin)}
      />
    </div>
  );
}
