import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, withApiHandler } from "@/lib/api-response";
import { getAuthenticatedUser, requireRole, MANAGERIAL_ROLES } from "@/lib/auth-helpers";
import { categoryQuerySchema, createCategorySchema } from "@/lib/validations/category.schema";

export const dynamic = "force-dynamic";

/** GET /api/categories - list categories with search & pagination */
export async function GET(request: NextRequest) {
  return withApiHandler(async () => {
    await getAuthenticatedUser();

    const query = categoryQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    );

    const where = {
      ...(query.includeDeleted ? {} : { deletedAt: null }),
      ...(query.search
        ? { name: { contains: query.search, mode: "insensitive" as const } }
        : {}),
    };

    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          _count: {
            select: {
              products: {
                where: { deletedAt: null },
              },
            },
          },
        },
      }),
      prisma.category.count({ where }),
    ]);

    return apiSuccess(categories, "Category list successfully retrieved.", 200, {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    });
  });
}

/** POST /api/categories - create new category (OWNER/ADMIN only) */
export async function POST(request: NextRequest) {
  return withApiHandler(async () => {
    const user = await getAuthenticatedUser();
    requireRole(user, MANAGERIAL_ROLES);

    const body = await request.json();
    const data = createCategorySchema.parse(body);

    const category = await prisma.category.create({ data });

    return apiSuccess(category, "Category successfully created.", 201);
  });
}
