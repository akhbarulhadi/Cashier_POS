import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiSuccess, withApiHandler } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-helpers";
import { createCustomerSchema, customerQuerySchema } from "@/lib/validations/customer.schema";

export const dynamic = "force-dynamic";

/** GET /api/customers - list customers with search & pagination */
export async function GET(request: NextRequest) {
  return withApiHandler(async () => {
    await getAuthenticatedUser();

    const query = customerQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    );

    const where: Prisma.CustomerWhereInput = {
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

/** POST /api/customers - create new customer */
export async function POST(request: NextRequest) {
  return withApiHandler(async () => {
    await getAuthenticatedUser();

    const body = await request.json();
    const data = createCustomerSchema.parse(body);

    const customer = await prisma.customer.create({ data });

    return apiSuccess(customer, "Customer successfully registered.", 201);
  });
}
