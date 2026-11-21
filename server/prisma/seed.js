const fs = require("node:fs/promises");
const path = require("node:path");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    throw new Error("ADMIN_USERNAME y ADMIN_PASSWORD son obligatorios para inicializar el panel.");
  }

  const contentPath = path.resolve(__dirname, "../../content/site.json");
  const content = JSON.parse(await fs.readFile(contentPath, "utf8"));
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.siteContent.upsert({
    where: { id: "main" },
    create: { id: "main", version: 1, data: content },
    update: {}
  });

  await prisma.adminUser.upsert({
    where: { username },
    create: { username, passwordHash },
    update: { passwordHash }
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
