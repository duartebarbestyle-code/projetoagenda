# Agenda Barbearia

Agendamento online no estilo Booksy: login com Google ou celular (SMS), cadastro no primeiro acesso, escolha de profissional → dia → horário → serviço, lembrete por SMS.

Stack: Next.js 16 · Better Auth · Neon Postgres (Vercel) · Drizzle · Twilio · Tailwind (design system HashiCorp).

## Rodar

1. `cp .env.example .env.local` e preencher. Para testar sem Neon: `DATABASE_URL=pglite:./.pglite` (Postgres local em arquivo).
2. `bun install`
3. `bun run db:setup` (cria tabelas e dados iniciais — ver `db/setup.sql`)
4. `bun run dev`

## Telas

| Rota | O que faz |
|------|-----------|
| `/entrar` | Google ou celular + código SMS, links para cadastro e recuperar acesso |
| `/recuperar` | CPF → código por SMS ou e-mail → entra na conta |
| `/cadastro` | Nome, sobrenome, e-mail, CPF, celular, endereço (CEP preenche via ViaCEP) → tabela `clientes` |
| `/agendar` | Profissional → dia → horário → serviço (+ estilo e observação opcionais nos cortes) → tabela `agendamentos` |
| `/portfolio` | Estilos de corte (tabela `estilos`, imagens em `public/portfolio/`) |
| `/meus-agendamentos` | Próximos horários do cliente, com cancelamento |
| `/admin` | Painel do barbeiro (cadastro com `tipo = 'admin'`): agenda do dia, marcar realizado/faltou, adicionar serviços extras |

Um CPF = uma conta: CPF, e-mail e celular não se repetem entre contas.

Horários e atendimentos que já passaram não aparecem. O banco impede dois agendamentos sobrepostos para o mesmo profissional.

## Lembretes SMS

- Confirmação enviada na hora do agendamento.
- `vercel.json` roda `/api/cron/lembretes` todo dia às 08:00 (Brasília) e avisa quem tem horário nas próximas `LEMBRETE_HORAS`.
- No plano Pro da Vercel dá para rodar de hora em hora (`0 * * * *`) com `LEMBRETE_HORAS=2`.

## WhatsApp dos barbeiros

- Em **Painel → Profissionais**, preencha o WhatsApp de cada barbeiro.
- Todo dia às 7h30 (Brasília) cada um recebe a agenda do dia (`/api/cron/agenda-barbeiros`).
- A cada agendamento novo, alterado, trocado de barbeiro ou cancelado, o barbeiro recebe um aviso.
- Envio pela Twilio (`TWILIO_WHATSAPP_FROM`). Sem isso, as mensagens aparecem só no log.

## Admin (barbeiros)

- Uma conta só, compartilhada pelos barbeiros: **duartebarbestyle@gmail.com** (tabela `emails_admin`).
- Entrar com Google nessa conta e fazer o cadastro uma vez; ela vira admin automaticamente.
- Admin vê o link **Painel** no menu.

## Ajustes

- Expediente, intervalo de horários e dias à frente: `src/lib/config.ts`.
- Serviços, preços e profissionais: tabelas `servicos` e `profissionais`.
