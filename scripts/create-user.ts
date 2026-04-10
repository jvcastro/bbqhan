/**
 * Create a staff user (credentials login).
 *
 * Usage:
 *   npx tsx scripts/create-user.ts <email> <password> [ADMIN|CASHIER] [display name]
 *
 * Examples:
 *   npx tsx scripts/create-user.ts maria@store.local mySecret456 CASHIER "Maria"
 *   npx tsx scripts/create-user.ts boss@store.local anotherSecret ADMIN
 */

import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient, UserRole } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const [, , emailArg, passwordArg, roleArg, ...nameParts] = process.argv;

if (!emailArg || !passwordArg) {
  console.error(`
Usage:
  npx tsx scripts/create-user.ts <email> <password> [ADMIN|CASHIER] [display name]

Examples:
  npx tsx scripts/create-user.ts maria@store.local mySecret456 CASHIER "Maria Santos"
  npx tsx scripts/create-user.ts boss@store.local secret ADMIN
`);
  process.exit(1);
}

const email = emailArg.toLowerCase().trim();
const password = passwordArg;
let role: UserRole = UserRole.CASHIER;
if (roleArg) {
  const r = roleArg.toUpperCase();
  if (r === "ADMIN") role = UserRole.ADMIN;
  else if (r === "CASHIER") role = UserRole.CASHIER;
  else {
    console.error('Role must be ADMIN or CASHIER (default: CASHIER).');
    process.exit(1);
  }
}

const name =
  nameParts.length > 0 ? nameParts.join(" ").trim() || null : null;

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.error(`User already exists: ${email}`);
    process.exit(1);
  }

  const passwordHash = await hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      role,
    },
  });

  console.log("Created staff user:");
  console.log(`  id:    ${user.id}`);
  console.log(`  email: ${user.email}`);
  console.log(`  role:  ${user.role}`);
  if (user.name) console.log(`  name:  ${user.name}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
