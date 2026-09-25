import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '../generated/prisma/client';
import { Role } from '../generated/prisma/enums';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? 'admin@local.com').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? 'admin1234';

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { role: Role.ADMIN, passwordHash },
    create: { email, passwordHash, role: Role.ADMIN },
  });

  console.log(`ADMIN pronto: ${admin.email} (${admin.id})`);
}

main()
  .catch((error) => {
    console.error('Falha ao rodar o seed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
