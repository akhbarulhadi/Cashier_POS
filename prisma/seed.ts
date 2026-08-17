/**
 * Prisma Seed Script
 * ============================================================================
 * Populates initial data that is SAFE to execute without relying on Supabase
 * Auth accounts (categories, sample products, sample customers, & default store settings).
 *
 * Users/staff are INTENTIONALLY NOT seeded here because they must be created via
 * the Supabase Auth Admin API (see `POST /api/users`) to ensure passwords are 
 * hashed and login sessions are completely valid. Create your first OWNER account via:
 *   1. Supabase Dashboard > Authentication > Add User (set email+password), OR
 *   2. `supabase.auth.admin.createUser()` through a separate script,
 *   then run: `UPDATE public.users SET role = 'OWNER' WHERE email = '...';`
 *
 * Run with: `npm run prisma:seed`
 * ============================================================================
 */

import { PrismaClient, StockMovementType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding StoreSetting...");
  const existingSettings = await prisma.storeSetting.findFirst();
  if (!existingSettings) {
    await prisma.storeSetting.create({
      data: {
        storeName: "Toko Maju Jaya",
        address: "Jl. Merdeka No. 123, Jakarta",
        phone: "021-1234567",
        email: "info@tokomajujaya.com",
        receiptFooter: "Terima kasih telah berbelanja di Toko Maju Jaya!",
        defaultTaxPercent: 11,
        currency: "IDR",
      },
    });
  }

  console.log("Seeding Categories...");
  const categoryData = [
    { name: "Makanan & Minuman", description: "Produk makanan dan minuman kemasan" },
    { name: "Sembako", description: "Kebutuhan pokok sehari-hari" },
    { name: "Elektronik", description: "Perangkat elektronik & aksesoris" },
    { name: "Kebersihan & Perawatan", description: "Produk kebersihan rumah & tubuh" },
    { name: "Alat Tulis Kantor", description: "Perlengkapan alat tulis & kantor" },
  ];

  const categories = [];
  for (const cat of categoryData) {
    const category = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
    categories.push(category);
  }

  console.log("Seeding Products...");
  const productData = [
    { sku: "MKN-001", name: "Mie Instan Goreng", categoryIdx: 0, costPrice: 2500, sellPrice: 3500, stock: 150, minStock: 30 },
    { sku: "MKN-002", name: "Kopi Sachet 3in1", categoryIdx: 0, costPrice: 1200, sellPrice: 2000, stock: 200, minStock: 40 },
    { sku: "MKN-003", name: "Air Mineral 600ml", categoryIdx: 0, costPrice: 2000, sellPrice: 3000, stock: 300, minStock: 50 },
    { sku: "SMB-001", name: "Beras Premium 5kg", categoryIdx: 1, costPrice: 62000, sellPrice: 70000, stock: 40, minStock: 10 },
    { sku: "SMB-002", name: "Minyak Goreng 2L", categoryIdx: 1, costPrice: 32000, sellPrice: 38000, stock: 25, minStock: 10 },
    { sku: "SMB-003", name: "Gula Pasir 1kg", categoryIdx: 1, costPrice: 13000, sellPrice: 16000, stock: 8, minStock: 15 },
    { sku: "ELK-001", name: "Kabel Data USB-C", categoryIdx: 2, costPrice: 15000, sellPrice: 25000, stock: 20, minStock: 5 },
    { sku: "ELK-002", name: "Power Bank 10000mAh", categoryIdx: 2, costPrice: 95000, sellPrice: 130000, stock: 12, minStock: 5 },
    { sku: "KBR-001", name: "Sabun Cuci Piring 800ml", categoryIdx: 3, costPrice: 9000, sellPrice: 13000, stock: 60, minStock: 15 },
    { sku: "KBR-002", name: "Deterjen Bubuk 1kg", categoryIdx: 3, costPrice: 14000, sellPrice: 19000, stock: 3, minStock: 10 },
    { sku: "ATK-001", name: "Pulpen Standar (Box)", categoryIdx: 4, costPrice: 18000, sellPrice: 25000, stock: 30, minStock: 8 },
    { sku: "ATK-002", name: "Buku Tulis 38 Lembar", categoryIdx: 4, costPrice: 3000, sellPrice: 5000, stock: 100, minStock: 20 },
  ];

  for (const p of productData) {
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        sku: p.sku,
        name: p.name,
        categoryId: categories[p.categoryIdx].id,
        costPrice: p.costPrice,
        sellPrice: p.sellPrice,
        stock: p.stock,
        minStock: p.minStock,
        unit: "pcs",
      },
    });

    const hasMovement = await prisma.stockMovement.findFirst({ where: { productId: product.id } });
    if (!hasMovement) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          type: StockMovementType.INITIAL,
          quantity: p.stock,
          stockBefore: 0,
          stockAfter: p.stock,
          note: "Stok awal (seed data).",
        },
      });
    }
  }

  console.log("Seeding Customers...");
  const customerData = [
    { name: "Budi Santoso", phone: "081234567890", email: "budi.santoso@example.com" },
    { name: "Siti Aminah", phone: "081298765432", email: "siti.aminah@example.com" },
    { name: "Andi Wijaya", phone: "081211112222", email: "andi.wijaya@example.com" },
  ];

  for (const c of customerData) {
    await prisma.customer.upsert({
      where: { phone: c.phone },
      update: {},
      create: c,
    });
  }

  console.log("Seeding selesai.");
}

main()
  .catch((e) => {
    console.error("Seeding gagal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
