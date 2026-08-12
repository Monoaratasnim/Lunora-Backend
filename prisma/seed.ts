import bcrypt from "bcrypt";
import { UserRole, UserStatus } from "../generated/prisma/enums.js";
import { prisma } from "../src/lib/prisma.js";

const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = "Admin@12345";
const BCRYPT_SALT_ROUNDS = 10;

async function main() {
  const existingUser = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  if (existingUser) {
    if (existingUser.isDeleted) {
      console.log(`Seed skipped: user ${ADMIN_EMAIL} is soft-deleted.`);
      return;
    }

    if (
      existingUser.role === UserRole.ADMIN &&
      existingUser.status === UserStatus.ACTIVE
    ) {
      console.log(`Seed skipped: user ${ADMIN_EMAIL} is already ADMIN and ACTIVE.`);
      return;
    }

    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });
    console.log(`Seed updated: user ${ADMIN_EMAIL} set to ADMIN and ACTIVE.`);
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_SALT_ROUNDS);

  await prisma.user.create({
    data: {
      name: "System Admin",
      email: ADMIN_EMAIL,
      password: passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      isDeleted: false,
    },
  });

  console.log(`Seed created: admin user ${ADMIN_EMAIL}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
