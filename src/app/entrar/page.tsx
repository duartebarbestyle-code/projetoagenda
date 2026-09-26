import Link from "next/link";
import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/sessao";
import { LoginForm } from "./login-form";

export default async function Entrar({ searchParams }: PageProps<"/entrar">) {
  if (await sessaoAtual()) redirect("/");
  const cadastro = Boolean((await searchParams).cadastro);
  return (
    <div className="mx-auto max-w-sm">
      <p className="eyebrow">{cadastro ? "Novo por aqui" : "Bem-vindo"}</p>
      <h1 className="mt-2 mb-8 text-[34px] font-bold leading-tight tracking-tight">
        {cadastro ? "Crie sua conta" : "Entre para agendar"}
      </h1>
      <LoginForm />
      <div className="mt-8 flex justify-between border-t border-steel pt-6 text-[15px]">
        {cadastro ? (
          <Link href="/entrar" className="text-graphite hover:text-signal">Já tenho conta</Link>
        ) : (
          <Link href="/entrar?cadastro=1" className="text-graphite hover:text-signal">Realizar cadastro</Link>
        )}
        <Link href="/recuperar" className="text-graphite hover:text-signal">Recuperar acesso</Link>
      </div>
    </div>
  );
}
