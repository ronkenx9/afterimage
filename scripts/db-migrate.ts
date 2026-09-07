import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const migration = resolve("packages/db/migrations/001_init.sql");
const sql = await readFile(migration, "utf8");
if (!sql.includes("order_intents") || !sql.includes("payload_hash")) throw new Error("Migration contract is incomplete");

if (!process.env.DATABASE_URL) {
  console.log("Migration verified. DATABASE_URL is unset, so no database was changed.");
  process.exit(0);
}

console.error("A hosted Postgres driver is intentionally not bundled in the local replay release.");
console.error(`Apply ${migration} with your approved Postgres migration runner.`);
process.exit(2);
