import { redirect } from "next/navigation";
import { ehAdmin, sessaoAtual } from "@/lib/sessao";

export default async function Home() {
  if (!(await sessaoAtual())) redirect("/entrar");
  redirect((await ehAdmin()) ? "/admin" : "/agendar");
}
