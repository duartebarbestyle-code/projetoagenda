import { Pool } from "@neondatabase/serverless";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { readFileSync } from "node:fs";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL não definido");
const sql = readFileSync("db/setup.sql", "utf8");

if (url.startsWith("pglite:")) {
  const db = new PGlite(url.slice(7), { extensions: { btree_gist } });
  await db.exec(sql);
  await db.close();
} else {
  const pool = new Pool({ connectionString: url });
  await pool.query(sql);
  await pool.end();
}
console.log("Banco pronto.");
