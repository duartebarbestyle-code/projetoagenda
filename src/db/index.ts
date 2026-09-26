import { neon } from "@neondatabase/serverless";
import type { PGlite as PGliteT } from "@electric-sql/pglite";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import * as schema from "./schema";

type DB = ReturnType<typeof drizzleNeon<typeof schema>>;

// DATABASE_URL=pglite:./.pglite roda um Postgres local em arquivo (desenvolvimento)
function conectar(): DB {
  const url = process.env.DATABASE_URL!;
  if (url.startsWith("pglite:")) {
    // Carregado fora do bundler (o Turbopack quebra os arquivos .wasm/.tar.gz do PGlite)
    const req = process.getBuiltinModule("module").createRequire(`${process.cwd()}/`);
    const { PGlite } = req("@electric-sql/pglite") as { PGlite: typeof PGliteT };
    const { btree_gist } = req("@electric-sql/pglite/contrib/btree_gist");
    const client = new PGlite(url.slice(7), { extensions: { btree_gist } });
    // Fecha o banco ao parar o servidor; sem isso o PGlite corrompe o arquivo
    for (const sinal of ["SIGINT", "SIGTERM"] as const)
      process.once(sinal, () => client.close().finally(() => process.exit(0)));
    return drizzlePglite(client, { schema }) as unknown as DB;
  }
  return drizzleNeon(neon(url), { schema });
}

// Conexão criada no primeiro uso (o build não exige DATABASE_URL) e reaproveitada no hot reload
const g = globalThis as { __db?: DB };

export const db = new Proxy({} as DB, {
  get(_, prop) {
    g.__db ??= conectar();
    return Reflect.get(g.__db, prop, g.__db);
  },
});
