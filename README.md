# Agenda Barbearia

Agendamento online no estilo Booksy: login com Google ou código no e-mail, cadastro no primeiro acesso, escolha de profissional → dia → horário → serviço, avisos por e-mail ou WhatsApp.

Stack: Next.js 16 · Better Auth · Neon Postgres (Vercel) · Drizzle · Resend · WhatsApp Cloud API (Meta) · Tailwind (design system HashiCorp).

## Rodar

1. `cp .env.example .env.local` e preencher. Para testar sem Neon: `DATABASE_URL=pglite:./.pglite` (Postgres local em arquivo).
2. `bun install`
3. `bun run db:setup` (cria tabelas e dados iniciais — ver `db/setup.sql`)
4. `bun run dev`

Sem Resend e sem WhatsApp configurados, o código de login e os avisos aparecem só no log do servidor.

## Telas

| Rota | O que faz |
|------|-----------|
| `/entrar` | Google ou e-mail + código, links para cadastro e recuperar acesso. E-mail novo cria a conta |
| `/recuperar` | CPF → código no e-mail da conta → entra (para quem esqueceu o e-mail usado) |
| `/cadastro` | Nome, sobrenome, e-mail, CPF, celular (WhatsApp), endereço (CEP preenche via ViaCEP), canal dos avisos → tabela `clientes` |
| `/agendar` | Profissional → dia → horário → serviço (+ estilo e observação opcionais nos cortes) → tabela `agendamentos` |
| `/portfolio` | Estilos de corte (tabela `estilos`, imagens em `public/portfolio/`) |
| `/meus-agendamentos` | Próximos horários do cliente, com cancelamento |
| `/admin` | Painel do barbeiro (cadastro com `tipo = 'admin'`): agenda do dia, marcar realizado/faltou, adicionar serviços extras |

Um CPF = uma conta: CPF, e-mail e celular não se repetem entre contas.

Cliente cadastrado no balcão (Painel → Novo agendamento → Cadastrar rápido) fica sem e-mail e recebe avisos por WhatsApp. Quando ele cria a conta pelo e-mail informando o mesmo CPF e celular, a conta nova assume o cadastro e os horários.

Horários e atendimentos que já passaram não aparecem. O banco impede dois agendamentos sobrepostos para o mesmo profissional.

## Avisos ao cliente

- Confirmação, alteração e cancelamento na hora; lembrete pelo cron.
- Canal escolhido no cadastro (`clientes.aviso`): e-mail (Resend) ou WhatsApp. Sem e-mail, vai por WhatsApp.
- `vercel.json` roda `/api/cron/lembretes` todo dia às 08:00 (Brasília) e avisa quem tem horário nas próximas `LEMBRETE_HORAS`.
- No plano Pro da Vercel dá para rodar de hora em hora (`0 * * * *`) com `LEMBRETE_HORAS=2`.

## WhatsApp dos barbeiros

- Em **Painel → Profissionais**, preencha o WhatsApp de cada barbeiro.
- Todo dia às 7h30 (Brasília) cada um recebe a agenda do dia (`/api/cron/agenda-barbeiros`).
- A cada agendamento novo, alterado, trocado de barbeiro ou cancelado, o barbeiro recebe um aviso.

## WhatsApp (Meta)

Envio pela WhatsApp Cloud API (`src/lib/whatsapp.ts`), com `WHATSAPP_TOKEN` e `WHATSAPP_PHONE_ID`. Mensagem enviada pela barbearia só sai por **modelo aprovado**. Cadastre no WhatsApp Manager, categoria **Utilidade**, idioma **Português (BR)**, com estes nomes e textos:

| Nome | Texto |
|------|-------|
| `agendamento_confirmado` | Olá, {{1}}! Seu horário de {{2}} está confirmado para {{3}} às {{4}} com {{5}}. |
| `agendamento_alterado` | Olá, {{1}}! Seu horário foi alterado: {{2}} em {{3}} às {{4}} com {{5}}. |
| `agendamento_cancelado` | Olá, {{1}}. Seu horário de {{2}} em {{3}} às {{4}} foi cancelado. |
| `lembrete_agendamento` | Lembrete, {{1}}: {{2}} {{3}} às {{4}} com {{5}}. |
| `aviso_barbeiro` | Aviso da agenda: {{1}}. {{2}} em {{3}} às {{4}}, cliente {{5}}. |
| `agenda_do_dia` | Bom dia, {{1}}! Sua agenda de {{2}}: {{3}}. Total: {{4}}. |

A ordem dos `{{n}}` é a que o código envia; mudar o texto na Meta não exige mudar o código, desde que a quantidade e a ordem continuem iguais. Os textos de e-mail ficam em `src/lib/aviso-cliente.ts`.

## Admin (barbeiros)

- Uma conta só, compartilhada pelos barbeiros: **duartebarbestyle@gmail.com** (tabela `emails_admin`).
- Entrar com esse e-mail (Google ou código) e fazer o cadastro uma vez; ela vira admin automaticamente.
- Admin vê o link **Painel** no menu.

## Ajustes

- Expediente, intervalo de horários e dias à frente: `src/lib/config.ts`.
- Serviços, preços e profissionais: tabelas `servicos` e `profissionais`.
