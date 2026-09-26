import { exigirAdmin } from "@/lib/sessao";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await exigirAdmin();
  return children;
}
