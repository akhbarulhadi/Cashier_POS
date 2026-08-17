import { prisma } from "@/lib/prisma";
import { apiSuccess, withApiHandler } from "@/lib/api-response";
import { ApiError } from "@/lib/api-error";
import { getAuthenticatedUser, requireRole, MANAGERIAL_ROLES } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: { sessionId: string };
}

/** GET /api/ai/chat-sessions/[sessionId] - Load satu sesi beserta semua message */
export async function GET(_request: Request, { params }: RouteParams) {
  return withApiHandler(async () => {
    const user = await getAuthenticatedUser();
    requireRole(user, MANAGERIAL_ROLES);

    const { sessionId } = params;

    const session = await prisma.aiChatSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            role: true,
            content: true,
            createdAt: true,
          },
        },
      },
    });

    if (!session || session.userId !== user.id) {
      throw ApiError.notFound("Sesi chat tidak ditemukan.");
    }

    return apiSuccess(session, "Sesi chat berhasil dimuat.");
  });
}

/** DELETE /api/ai/chat-sessions/[sessionId] - Hapus sesi chat */
export async function DELETE(_request: Request, { params }: RouteParams) {
  return withApiHandler(async () => {
    const user = await getAuthenticatedUser();
    requireRole(user, MANAGERIAL_ROLES);

    const { sessionId } = params;

    const session = await prisma.aiChatSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== user.id) {
      throw ApiError.notFound("Sesi chat tidak ditemukan.");
    }

    await prisma.aiChatSession.delete({ where: { id: sessionId } });

    return apiSuccess(null, "Sesi chat berhasil dihapus.");
  });
}
