import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { createAuthMiddleware } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { emailOTP } from "better-auth/plugins";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { enviarEmail } from "./email";
import { BARBEARIA } from "./config";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  // Todo acesso novo pede código: a sessão acaba ao fechar o navegador e dura no máximo 12h
  session: { expiresIn: 60 * 60 * 12, updateAge: 60 * 60 * 12 },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      const nova = ctx.context.newSession;
      if (nova) await setSessionCookie(ctx, nova, true);
    }),
  },
  // Google com o mesmo e-mail do cadastro entra na mesma conta
  account: { accountLinking: { enabled: true, trustedProviders: ["google"] } },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  plugins: [
    // Login por código no e-mail; e-mail novo cria a conta (o cadastro é completado em /cadastro)
    emailOTP({
      sendVerificationOTP: ({ email, otp }) =>
        enviarEmail(email, `${BARBEARIA}: código de acesso`, `Seu código de acesso é ${otp}. Ele vale por 5 minutos.`),
    }),
    nextCookies(),
  ],
});
