import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clientes } from "@/db/schema";
import { exigirUsuario } from "@/lib/sessao";
import { CadastroForm } from "./cadastro-form";

export default async function Cadastro() {
  const user = await exigirUsuario();
  const [cliente] = await db.select().from(clientes).where(eq(clientes.userId, user.id));
  // Quem entrou pelo código no e-mail (ou Google) já tem o e-mail confirmado: ele é o login e não muda aqui
  const emailLogin = user.emailVerified && !user.email.endsWith(".local") ? user.email : "";

  return (
    <div className="mx-auto max-w-xl">
      <p className="eyebrow">Primeiro acesso</p>
      <h1 className="mt-2 mb-8 text-[34px] font-bold leading-tight tracking-tight">Complete seu cadastro</h1>
      <CadastroForm
        inicial={
          cliente
            ? { ...cliente, nomeCompleto: `${cliente.nome} ${cliente.sobrenome}`, email: emailLogin || cliente.email, createdAt: null }
            : {
                // Conta criada pelo código no e-mail nasce sem nome (ou com o próprio e-mail)
                nomeCompleto: !user.name || user.name.includes("@") || user.name.startsWith("+") ? "" : user.name,
                email: emailLogin,
              }
        }
        emailFixo={Boolean(emailLogin)}
      />
    </div>
  );
}
