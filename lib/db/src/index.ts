import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import pg from "pg";
import ws from "ws";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const DATABASE_URL = process.env.DATABASE_URL;

// Detect whether we're pointing at a real Neon database (neon.tech hostname)
// or a local / self-hosted Postgres instance.
const isNeon = DATABASE_URL.includes("neon.tech");

let db: ReturnType<typeof drizzleNeon<typeof schema>> | ReturnType<typeof drizzlePg<typeof schema>>;

if (isNeon) {
  // Production path: use @neondatabase/serverless over WebSockets
  neonConfig.webSocketConstructor = ws;
  const pool = new NeonPool({ connectionString: DATABASE_URL });
  db = drizzleNeon(pool, { schema });
} else {
  // Local / CI path: use standard node-postgres
  const { Pool } = pg;
  const pool = new Pool({ connectionString: DATABASE_URL });
  db = drizzlePg(pool, { schema });
}

export { db };
export * from "./schema";
