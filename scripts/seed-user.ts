import { db } from "../lib/db";
import { users } from "../lib/db/schema";
import { hashPassword } from "../lib/auth/password";

const [, , email, password] = process.argv;

if (!email || !password) {
  console.error("Usage: npx tsx scripts/seed-user.ts <email> <password>");
  process.exit(1);
}

async function main() {
  const passwordHash = await hashPassword(password);
  db.insert(users).values({ email, passwordHash }).run();
  console.log(`User ${email} created.`);
}

main();
