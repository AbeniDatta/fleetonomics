import { config } from "dotenv";
import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

config({ path: ".env.local" });
config({ path: ".env" });

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Set DIRECT_URL or DATABASE_URL before seeding");
}

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const demoEmail = process.env.AUTH_DEMO_EMAIL ?? "ops@nlng.local";
  const demoPassword = process.env.AUTH_DEMO_PASSWORD ?? "changeme";
  const demoRoles = (process.env.AUTH_DEMO_ROLES ?? "Ops Manager,Admin")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const passwordHash = await hash(demoPassword, 12);

  await prisma.user.upsert({
    where: { email: demoEmail },
    update: { name: "Ops Manager", passwordHash, roles: demoRoles },
    create: {
      email: demoEmail,
      name: "Ops Manager",
      passwordHash,
      roles: demoRoles,
    },
  });

  await prisma.workOrder.deleteMany();
  await prisma.workOrder.createMany({
    data: [
      {
        vehiclePlate: "NL-0561",
        type: "Scheduled",
        issue: "50,000km service",
        priority: "medium",
        status: "In progress",
      },
      {
        vehiclePlate: "NL-0392",
        type: "Unscheduled",
        issue: "Fuel sensor check",
        priority: "high",
        status: "Pending",
      },
    ],
  });

  await prisma.tripBooking.deleteMany();
  await prisma.tripBooking.createMany({
    data: [
      {
        requester: "E. Chukwu",
        route: "Trans-Amadi → Depot A",
        scheduledAt: new Date(),
        vehicleType: "SUV",
        priority: "Normal",
        status: "pending",
      },
      {
        requester: "M. Hassan",
        route: "Bonny → PH Port",
        scheduledAt: new Date(Date.now() + 90 * 60_000),
        vehicleType: "Truck",
        priority: "Urgent",
        status: "pending",
      },
    ],
  });

  await prisma.complianceDocument.deleteMany();
  await prisma.complianceDocument.createMany({
    data: [
      {
        subjectId: "NL-0392",
        docType: "Road worthiness",
        expiresOn: new Date("2026-05-01"),
      },
      {
        subjectId: "NL-0847",
        docType: "Insurance policy",
        expiresOn: new Date("2026-05-18"),
      },
    ],
  });

  console.log("Seed complete: user, work orders, trip bookings, compliance documents");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
