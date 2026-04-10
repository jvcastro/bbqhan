import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
  InventoryLogType,
  PrismaClient,
  ProductCategory,
  UserRole,
} from "../src/generated/prisma/client";
import { getManilaBusinessDate } from "../src/lib/date";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required for seeding");
}

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

const peso = (n: number) => Math.round(n * 100);

async function main() {
  await prisma.inventoryLog.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.dailyInventory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  const adminPass = process.env.SEED_ADMIN_PASSWORD ?? "admin123";
  const cashierPass = process.env.SEED_CASHIER_PASSWORD ?? "cashier123";

  const admin = await prisma.user.create({
    data: {
      email: "admin@bbqhan.local",
      passwordHash: await hash(adminPass, 10),
      name: "Admin",
      role: UserRole.ADMIN,
    },
  });

  await prisma.user.create({
    data: {
      email: "cashier@bbqhan.local",
      passwordHash: await hash(cashierPass, 10),
      name: "Cashier",
      role: UserRole.CASHIER,
    },
  });

  const catalog: {
    name: string;
    category: ProductCategory;
    pricePhp: number;
    defaultDailyStock: number;
    lowStockThreshold: number | null;
    sortOrder: number;
  }[] = [
    {
      name: "Pork BBQ",
      category: ProductCategory.GRILLED,
      pricePhp: 25,
      defaultDailyStock: 80,
      lowStockThreshold: 10,
      sortOrder: 0,
    },
    {
      name: "Chicken BBQ",
      category: ProductCategory.GRILLED,
      pricePhp: 30,
      defaultDailyStock: 60,
      lowStockThreshold: 8,
      sortOrder: 1,
    },
    {
      name: "Isaw Manok",
      category: ProductCategory.INNARDS,
      pricePhp: 12,
      defaultDailyStock: 100,
      lowStockThreshold: 15,
      sortOrder: 2,
    },
    {
      name: "Isaw Baboy",
      category: ProductCategory.INNARDS,
      pricePhp: 12,
      defaultDailyStock: 100,
      lowStockThreshold: 15,
      sortOrder: 3,
    },
    {
      name: "Betamax",
      category: ProductCategory.INNARDS,
      pricePhp: 15,
      defaultDailyStock: 80,
      lowStockThreshold: 10,
      sortOrder: 4,
    },
    {
      name: "Adidas",
      category: ProductCategory.INNARDS,
      pricePhp: 15,
      defaultDailyStock: 60,
      lowStockThreshold: 8,
      sortOrder: 5,
    },
    {
      name: "Tenga",
      category: ProductCategory.INNARDS,
      pricePhp: 15,
      defaultDailyStock: 60,
      lowStockThreshold: 8,
      sortOrder: 6,
    },
    {
      name: "Hotdog",
      category: ProductCategory.SNACKS,
      pricePhp: 18,
      defaultDailyStock: 70,
      lowStockThreshold: 10,
      sortOrder: 7,
    },
    {
      name: "Fish Ball",
      category: ProductCategory.SNACKS,
      pricePhp: 10,
      defaultDailyStock: 120,
      lowStockThreshold: 20,
      sortOrder: 8,
    },
    {
      name: "Kikiam",
      category: ProductCategory.SNACKS,
      pricePhp: 12,
      defaultDailyStock: 100,
      lowStockThreshold: 15,
      sortOrder: 9,
    },
  ];

  const products = await prisma.$transaction(
    catalog.map((p) =>
      prisma.product.create({
        data: {
          name: p.name,
          category: p.category,
          priceCents: peso(p.pricePhp),
          defaultDailyStock: p.defaultDailyStock,
          lowStockThreshold: p.lowStockThreshold,
          sortOrder: p.sortOrder,
          isAvailable: true,
          isArchived: false,
        },
      }),
    ),
  );

  const businessDate = getManilaBusinessDate();

  for (const p of products) {
    const beginning = p.defaultDailyStock;
    const row = await prisma.dailyInventory.create({
      data: {
        businessDate,
        productId: p.id,
        beginningStock: beginning,
        currentStock: beginning,
      },
    });
    await prisma.inventoryLog.create({
      data: {
        dailyInventoryId: row.id,
        type: InventoryLogType.OPENING,
        quantityDelta: beginning,
        note: "Seed opening stock",
        userId: admin.id,
      },
    });
  }

  console.log("Seed complete.");
  console.log("  admin@bbqhan.local /", adminPass);
  console.log("  cashier@bbqhan.local /", cashierPass);
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
