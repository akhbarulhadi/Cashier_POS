import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, withApiHandler } from "@/lib/api-response";
import {
  getAuthenticatedUserWithStore,
  requireRole,
  MANAGERIAL_ROLES,
} from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/** GET /api/ai/chat-sessions - List semua sesi chat milik user yang login (scoped ke toko) */
export async function GET() {
  return withApiHandler(async () => {
    const user = await getAuthenticatedUserWithStore();
    requireRole(user, MANAGERIAL_ROLES);

    const sessions = await prisma.aiChatSession.findMany({
      where: { userId: user.id, storeId: user.storeId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    });

    return apiSuccess(sessions, "Daftar sesi chat berhasil diambil.");
  });
}

/** POST /api/ai/chat-sessions - Buat sesi chat baru (scoped ke toko) */
export async function POST(request: NextRequest) {
  return withApiHandler(async () => {
    const user = await getAuthenticatedUserWithStore();
    requireRole(user, MANAGERIAL_ROLES);

    let title = "Sesi Baru";
    try {
      const body = await request.json();
      if (body?.title && typeof body.title === "string") {
        title = body.title.trim().slice(0, 100) || "Sesi Baru";
      }
    } catch {
      // Body kosong / invalid JSON, pakai default title
    }

    const session = await prisma.aiChatSession.create({
      data: {
        userId: user.id,
        storeId: user.storeId,
        title,
      },
    });

    return apiSuccess(session, "Sesi chat baru berhasil dibuat.", 201);
  });
}
