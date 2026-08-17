import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiSuccess, withApiHandler } from "@/lib/api-response";
import { getAuthenticatedUser, requireRole, OWNER_ONLY_ROLES } from "@/lib/auth-helpers";

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

/** GET /api/settings - konfigurasi toko (dipakai untuk header struk, PPN default, dll) */
export async function GET() {
  return withApiHandler(async () => {
    await getAuthenticatedUser();

    let settings = await prisma.storeSetting.findFirst();

    if (!settings) {
      settings = await prisma.storeSetting.create({
        data: {
          storeName: "Toko Saya",
          currency: "IDR",
          defaultTaxPercent: 0,
        },
      });
    }

    return apiSuccess(settings, "Pengaturan toko berhasil diambil.");
  });
}

/** PATCH /api/settings - update konfigurasi toko (khusus OWNER) */
export async function PATCH(request: NextRequest) {
  return withApiHandler(async () => {
    const user = await getAuthenticatedUser();
    requireRole(user, OWNER_ONLY_ROLES);

    const body = await request.json();
    const data = storeSettingSchema.partial().parse(body);

    const existing = await prisma.storeSetting.findFirst();

    const settings = existing
      ? await prisma.storeSetting.update({ where: { id: existing.id }, data })
      : await prisma.storeSetting.create({
          data: { storeName: "Toko Saya", ...data },
        });

    return apiSuccess(settings, "Pengaturan toko berhasil diperbarui.");
  });
}
