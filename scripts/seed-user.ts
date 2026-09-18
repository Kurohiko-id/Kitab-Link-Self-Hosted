import { db } from "../lib/db";
import { users } from "../lib/db/schema";
import { hashPassword } from "../lib/auth/password";

const [, , username, password] = process.argv;

if (!username || !password) {
  console.error("Usage: npx tsx scripts/seed-user.ts <username> <password>");
  process.exit(1);
}

async function main() {
  const passwordHash = await hashPassword(password);
  db.insert(users).values({ username, passwordHash }).run();
  console.log(`User ${username} created.`);
}

main();
