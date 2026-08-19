import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiSuccess, withApiHandler } from "@/lib/api-response";
import { getAuthenticatedUserWithStore, requireRole, OWNER_ONLY_ROLES } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

const storeSettingSchema = z.object({
  storeName: z.string().trim().min(2).max(150),
  address: z.string().trim().max(500).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  email: z.string().trim().email().optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
  receiptFooter: z.string().trim().max(300).optional().nullable(),
  defaultTaxPercent: z.coerce.number().min(0).max(100).default(0),
  currency: z.string().trim().max(10).default("IDR"),
});

/** GET /api/settings - konfigurasi toko milik user yang sedang login */
export async function GET() {
  return withApiHandler(async () => {
    const user = await getAuthenticatedUserWithStore();

    const store = await prisma.store.findUnique({
      where: { id: user.storeId },
    });

    if (!store) {
      throw new Error("Data toko tidak ditemukan. Hubungi administrator.");
    }

    // Map Store fields ke format response yang kompatibel dengan UI lama
    return apiSuccess(
      {
        id: store.id,
        storeName: store.name,
        address: store.address,
        phone: store.phone,
        email: store.email,
        logoUrl: store.logoUrl,
        receiptFooter: store.receiptFooter,
        defaultTaxPercent: store.defaultTaxPercent,
        currency: store.currency,
        createdAt: store.createdAt,
        updatedAt: store.updatedAt,
      },
      "Pengaturan toko berhasil diambil."
    );
  });
}

/** PATCH /api/settings - update konfigurasi toko (khusus OWNER) */
export async function PATCH(request: NextRequest) {
  return withApiHandler(async () => {
    const user = await getAuthenticatedUserWithStore();
    requireRole(user, OWNER_ONLY_ROLES);

    const body = await request.json();
    const data = storeSettingSchema.partial().parse(body);

    const updated = await prisma.store.update({
      where: { id: user.storeId },
      data: {
        ...(data.storeName !== undefined ? { name: data.storeName } : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl } : {}),
        ...(data.receiptFooter !== undefined ? { receiptFooter: data.receiptFooter } : {}),
        ...(data.defaultTaxPercent !== undefined ? { defaultTaxPercent: data.defaultTaxPercent } : {}),
        ...(data.currency !== undefined ? { currency: data.currency } : {}),
      },
    });

    return apiSuccess(
      {
        id: updated.id,
        storeName: updated.name,
        address: updated.address,
        phone: updated.phone,
        email: updated.email,
        logoUrl: updated.logoUrl,
        receiptFooter: updated.receiptFooter,
        defaultTaxPercent: updated.defaultTaxPercent,
        currency: updated.currency,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
      "Pengaturan toko berhasil diperbarui."
    );
  });
}
