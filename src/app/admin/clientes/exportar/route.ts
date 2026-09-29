import { ehAdmin } from "@/lib/sessao";
import { mascaraCep, mascaraCelular, mascaraCpf } from "@/lib/mascaras";
import { dataLocal, fmtDataCompleta } from "@/lib/time";
import { listarClientes } from "../dados";

// Célula de CSV: aspas escapadas; texto que começa com = + - @ vira texto (o Excel executaria como fórmula)
function celula(v: string | number | null | undefined) {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Planilha para o Excel em português: separador ";", UTF-8 com BOM (acentos) e CPF formatado (mantém os zeros)
export async function GET(req: Request) {
  if (!(await ehAdmin())) return new Response("Não autorizado", { status: 401 });

  const busca = new URL(req.url).searchParams.get("q") ?? "";
  const lista = await listarClientes(busca);
  const data = (d: Date | null) => (d ? fmtDataCompleta(d) : "");

  const cabecalho = [
    "Nome", "Sobrenome", "CPF", "Celular", "E-mail", "Avisos por",
    "CEP", "Rua", "Número", "Complemento", "Bairro", "Cidade", "UF",
    "Atendimentos", "Faltas", "Último atendimento", "Próximo horário", "Cadastrado em",
  ];
  const linhas = lista.map((c) => [
    c.nome, c.sobrenome, mascaraCpf(c.cpf), mascaraCelular(c.celular), c.email ?? "", c.aviso === "whatsapp" ? "WhatsApp" : "E-mail",
    c.cep ? mascaraCep(c.cep) : "", c.rua, c.numero, c.complemento, c.bairro, c.cidade, c.uf,
    c.realizados, c.faltas, data(c.ultimo), data(c.proximo), data(c.cadastro),
  ]);

  const csv = "﻿" + [cabecalho, ...linhas].map((l) => l.map(celula).join(";")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="clientes-${dataLocal()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
