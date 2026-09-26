import { RecuperarForm } from "./recuperar-form";

export default function Recuperar() {
  return (
    <div className="mx-auto max-w-sm">
      <p className="eyebrow">Recuperar acesso</p>
      <h1 className="mt-2 mb-8 text-[34px] font-bold leading-tight tracking-tight">Encontre sua conta</h1>
      <RecuperarForm />
    </div>
  );
}
