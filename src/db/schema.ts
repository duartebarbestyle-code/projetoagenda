// Espelha db/setup.sql
import {
  boolean,
  char,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true });

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  phoneNumber: text("phone_number").unique(),
  phoneNumberVerified: boolean("phone_number_verified"),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: ts("expires_at").notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: ts("access_token_expires_at"),
  refreshTokenExpiresAt: ts("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: ts("expires_at").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const clientes = pgTable("clientes", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  sobrenome: text("sobrenome").notNull(),
  email: text("email"),
  cpf: char("cpf", { length: 11 }).notNull().unique(),
  celular: text("celular").notNull(),
  cep: char("cep", { length: 8 }),
  rua: text("rua"),
  numero: text("numero"),
  complemento: text("complemento"),
  bairro: text("bairro"),
  cidade: text("cidade"),
  uf: char("uf", { length: 2 }),
  tipo: text("tipo", { enum: ["cliente", "admin"] }).notNull().default("cliente"),
  aviso: text("aviso", { enum: ["sms", "email"] }).notNull().default("sms"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const servicos = pgTable("servicos", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  duracaoMin: integer("duracao_min").notNull(),
  precoCentavos: integer("preco_centavos").notNull(),
  permiteEstilo: boolean("permite_estilo").notNull().default(false),
  ativo: boolean("ativo").notNull().default(true),
});

export const emailsAdmin = pgTable("emails_admin", {
  email: text("email").primaryKey(),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const estilos = pgTable("estilos", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  imagemUrl: text("imagem_url"),
  ativo: boolean("ativo").notNull().default(true),
});

export const profissionais = pgTable("profissionais", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  telefone: text("telefone"),
  ativo: boolean("ativo").notNull().default(true),
});

export const agendamentos = pgTable("agendamentos", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  servicoId: integer("servico_id").notNull().references(() => servicos.id),
  profissionalId: integer("profissional_id").notNull().references(() => profissionais.id),
  inicio: ts("inicio").notNull(),
  fim: ts("fim").notNull(),
  estiloId: integer("estilo_id").references(() => estilos.id),
  observacao: text("observacao"),
  status: text("status", { enum: ["marcado", "realizado", "faltou", "cancelado"] }).notNull().default("marcado"),
  lembreteEnviadoEm: ts("lembrete_enviado_em"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const agendamentoExtras = pgTable("agendamento_extras", {
  id: serial("id").primaryKey(),
  agendamentoId: integer("agendamento_id").notNull().references(() => agendamentos.id, { onDelete: "cascade" }),
  servicoId: integer("servico_id").notNull().references(() => servicos.id),
  precoCentavos: integer("preco_centavos").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
});
