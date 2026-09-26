export function BotaoAtivo({ ativo, acao }: { ativo: boolean; acao: () => Promise<void> }) {
  return (
    <form action={acao}>
      <button className={`btn-ghost px-3 py-2 text-[13px] ${ativo ? "hover:border-red-400 hover:text-red-400" : ""}`}>
        {ativo ? "Desativar" : "Ativar"}
      </button>
    </form>
  );
}

export function Selo({ ativo }: { ativo: boolean }) {
  return ativo ? null : <span className="rounded-md border border-steel px-2 py-0.5 text-[13px] text-ash">Inativo</span>;
}
