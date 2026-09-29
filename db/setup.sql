-- Estrutura do banco (Postgres/Neon). Rodar com: bun run db:setup
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Autenticação (Better Auth)
CREATE TABLE IF NOT EXISTS "user" (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  email_verified boolean NOT NULL DEFAULT false,
  image text,
  phone_number text UNIQUE,
  phone_number_verified boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS session (
  id text PRIMARY KEY,
  expires_at timestamptz NOT NULL,
  token text NOT NULL UNIQUE,
  ip_address text,
  user_agent text,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS account (
  id text PRIMARY KEY,
  account_id text NOT NULL,
  provider_id text NOT NULL,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  password text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS verification (
  id text PRIMARY KEY,
  identifier text NOT NULL,
  value text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS session_user_id_idx ON session (user_id);
CREATE INDEX IF NOT EXISTS account_user_id_idx ON account (user_id);
CREATE INDEX IF NOT EXISTS verification_identifier_idx ON verification (identifier);

-- Cadastro (clientes e barbeiros). tipo = 'admin' libera o painel da barbearia.
-- E-mail e endereço ficam vazios no cadastro rápido feito pelo barbeiro (cliente completa depois).
CREATE TABLE IF NOT EXISTS clientes (
  user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  nome text NOT NULL,
  sobrenome text NOT NULL,
  email text,
  cpf char(11) NOT NULL UNIQUE,
  celular text NOT NULL,
  cep char(8),
  rua text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  uf char(2),
  tipo text NOT NULL DEFAULT 'cliente' CHECK (tipo IN ('cliente', 'admin')),
  aviso text NOT NULL DEFAULT 'email' CHECK (aviso IN ('email', 'whatsapp')), -- canal dos avisos de agendamento
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS servicos (
  id serial PRIMARY KEY,
  nome text NOT NULL,
  duracao_min integer NOT NULL,
  preco_centavos integer NOT NULL,
  permite_estilo boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true
);

-- telefone: WhatsApp do barbeiro (+55...), recebe a agenda do dia e os avisos
-- foto_url: foto mostrada ao cliente na escolha do profissional
CREATE TABLE IF NOT EXISTS profissionais (
  id serial PRIMARY KEY,
  nome text NOT NULL,
  telefone text,
  foto_url text,
  ativo boolean NOT NULL DEFAULT true
);

-- E-mails que viram admin ao se cadastrar com Google (gestão da barbearia)
CREATE TABLE IF NOT EXISTS emails_admin (
  email text PRIMARY KEY CHECK (email = lower(email)),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Portfólio de estilos (imagens em public/portfolio/)
CREATE TABLE IF NOT EXISTS estilos (
  id serial PRIMARY KEY,
  nome text NOT NULL,
  imagem_url text,
  ativo boolean NOT NULL DEFAULT true
);

-- Agendamentos. status: marcado → realizado | faltou, ou cancelado
CREATE TABLE IF NOT EXISTS agendamentos (
  id serial PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  servico_id integer NOT NULL REFERENCES servicos(id),
  profissional_id integer NOT NULL REFERENCES profissionais(id),
  inicio timestamptz NOT NULL,
  fim timestamptz NOT NULL,
  estilo_id integer REFERENCES estilos(id),
  observacao text,
  status text NOT NULL DEFAULT 'marcado',
  lembrete_enviado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Serviços adicionados pelo barbeiro na hora do atendimento
CREATE TABLE IF NOT EXISTS agendamento_extras (
  id serial PRIMARY KEY,
  agendamento_id integer NOT NULL REFERENCES agendamentos(id) ON DELETE CASCADE,
  servico_id integer NOT NULL REFERENCES servicos(id),
  preco_centavos integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ajustes para bancos criados antes (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'servicos' AND column_name = 'permite_estilo') THEN
    ALTER TABLE servicos ADD COLUMN permite_estilo boolean NOT NULL DEFAULT false;
    UPDATE servicos SET permite_estilo = true WHERE nome ILIKE '%corte%';
  END IF;
END $$;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'cliente';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS aviso text NOT NULL DEFAULT 'email';
-- SMS saiu: quem escolheu SMS passa a receber pelo WhatsApp do mesmo celular
ALTER TABLE clientes DROP CONSTRAINT IF EXISTS clientes_aviso_check;
UPDATE clientes SET aviso = 'whatsapp' WHERE aviso NOT IN ('email', 'whatsapp');
ALTER TABLE clientes ALTER COLUMN aviso SET DEFAULT 'email';
ALTER TABLE clientes ADD CONSTRAINT clientes_aviso_check CHECK (aviso IN ('email', 'whatsapp'));
ALTER TABLE clientes ALTER COLUMN email DROP NOT NULL, ALTER COLUMN cep DROP NOT NULL, ALTER COLUMN rua DROP NOT NULL,
  ALTER COLUMN numero DROP NOT NULL, ALTER COLUMN bairro DROP NOT NULL, ALTER COLUMN cidade DROP NOT NULL,
  ALTER COLUMN uf DROP NOT NULL;
ALTER TABLE profissionais ADD COLUMN IF NOT EXISTS telefone text;
ALTER TABLE profissionais ADD COLUMN IF NOT EXISTS foto_url text;
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS estilo_id integer REFERENCES estilos(id);
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS observacao text;

-- Regras (recriadas para valer também em bancos antigos)
ALTER TABLE clientes DROP CONSTRAINT IF EXISTS clientes_tipo_check;
ALTER TABLE clientes ADD CONSTRAINT clientes_tipo_check CHECK (tipo IN ('cliente', 'admin'));
ALTER TABLE agendamentos DROP CONSTRAINT IF EXISTS agendamentos_status_check;
ALTER TABLE agendamentos ADD CONSTRAINT agendamentos_status_check
  CHECK (status IN ('marcado', 'realizado', 'faltou', 'cancelado'));
ALTER TABLE agendamentos DROP CONSTRAINT IF EXISTS agendamentos_fim_check;
ALTER TABLE agendamentos ADD CONSTRAINT agendamentos_fim_check CHECK (fim > inicio);
-- impede dois horários sobrepostos para o mesmo profissional
ALTER TABLE agendamentos DROP CONSTRAINT IF EXISTS agendamentos_sem_conflito;
ALTER TABLE agendamentos ADD CONSTRAINT agendamentos_sem_conflito EXCLUDE USING gist (
  profissional_id WITH =,
  tstzrange(inicio, fim) WITH &&
) WHERE (status <> 'cancelado');

CREATE INDEX IF NOT EXISTS agendamentos_inicio_idx ON agendamentos (inicio);
CREATE INDEX IF NOT EXISTS agendamentos_user_id_idx ON agendamentos (user_id);
CREATE INDEX IF NOT EXISTS agendamento_extras_agendamento_idx ON agendamento_extras (agendamento_id);

-- E-mail do cadastro vale para login/recuperação
UPDATE "user" u SET email = c.email
FROM clientes c
WHERE c.user_id = u.id AND u.email LIKE '%@celular.local'
  AND NOT EXISTS (SELECT 1 FROM "user" o WHERE o.email = c.email);

-- Dados iniciais (editar à vontade)
INSERT INTO servicos (nome, duracao_min, preco_centavos, permite_estilo)
SELECT * FROM (VALUES
  ('Corte', 30, 4500, true),
  ('Barba', 30, 3500, false),
  ('Sobrancelha', 15, 2000, false),
  ('Corte + Barba', 60, 7000, true),
  ('Corte + Sobrancelha', 45, 6000, true)
) AS v(nome, duracao_min, preco_centavos, permite_estilo)
WHERE NOT EXISTS (SELECT 1 FROM servicos);

INSERT INTO profissionais (nome)
SELECT * FROM (VALUES ('Barbeiro 1'), ('Barbeiro 2'), ('Barbeiro 3')) AS v(nome)
WHERE NOT EXISTS (SELECT 1 FROM profissionais);

INSERT INTO estilos (nome)
SELECT * FROM (VALUES ('Degradê'), ('Social'), ('Low fade'), ('Mid fade'), ('Tesoura'), ('Moicano')) AS v(nome)
WHERE NOT EXISTS (SELECT 1 FROM estilos);

INSERT INTO emails_admin (email) VALUES ('duartebarbestyle@gmail.com') ON CONFLICT DO NOTHING;

-- Quem já tem cadastro com e-mail admin confirmado vira admin
UPDATE clientes c SET tipo = 'admin'
FROM "user" u
WHERE u.id = c.user_id AND u.email_verified
  AND lower(c.email) = lower(u.email)
  AND lower(c.email) IN (SELECT email FROM emails_admin);

-- Conta única de gestão, compartilhada pelos barbeiros.
