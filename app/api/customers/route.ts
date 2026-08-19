import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiSuccess, withApiHandler } from "@/lib/api-response";
import { getAuthenticatedUserWithStore } from "@/lib/auth-helpers";
import { createCustomerSchema, customerQuerySchema } from "@/lib/validations/customer.schema";

export const dynamic = "force-dynamic";

/** GET /api/customers - list customers (scoped to user's store) */
export async function GET(request: NextRequest) {
  return withApiHandler(async () => {
    const user = await getAuthenticatedUserWithStore();

    const query = customerQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    );

    const where: Prisma.CustomerWhereInput = {
      storeId: user.storeId,
      deletedAt: null,
      ...(query.search
        ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { phone: { contains: query.search, mode: "insensitive" } },
            { email: { contains: query.search, mode: "insensitive" } },
          ],
        }
        : {}),
    };

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.customer.count({ where }),
    ]);

    return apiSuccess(customers, "Customer list successfully retrieved.", 200, {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    });
  });
}

/** POST /api/customers - create new customer (scoped to user's store) */
export async function POST(request: NextRequest) {
  return withApiHandler(async () => {
    const user = await getAuthenticatedUserWithStore();

    const body = await request.json();
    const data = createCustomerSchema.parse(body);

    const customer = await prisma.customer.create({
      data: {
        ...data,
        storeId: user.storeId,
      },
    });

    return apiSuccess(customer, "Customer successfully registered.", 201);
  });
}
