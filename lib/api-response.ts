import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/api-error";

/**
 * Consistent API response format across the application.
 * ----------------------------------------------------------------------------
 * Success: { success: true, message, data, meta? }
 * Error  : { success: false, message, code, errors? }
 */

type Meta = {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  [key: string]: unknown;
};

export function apiSuccess<T>(
  data: T,
  message = "Success",
  status = 200,
  meta?: Meta
) {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
      ...(meta ? { meta } : {}),
    },
    { status }
  );
}

export function apiError(
  message: string,
  status = 500,
  code = "INTERNAL_SERVER_ERROR",
  errors?: unknown
) {
  return NextResponse.json(
    {
      success: false,
      message,
      code,
      ...(errors ? { errors } : {}),
    },
    { status }
  );
}

/**
 * Standard wrapper for all API Route handlers.
 * Catches Zod errors, custom ApiErrors, common Prisma errors, and other
 * unexpected errors, converting them into a consistent JSON response.
 */
export async function withApiHandler(
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    return await handler();
  } catch (err) {
    return handleApiError(err);
  }
}

export function handleApiError(err: unknown): NextResponse {
  // 1) Zod validation error
  if (err instanceof ZodError) {
    console.error("[ZOD_VALIDATION_ERROR]", JSON.stringify(err.flatten().fieldErrors, null, 2));
    return apiError(
      "Input validation failed.",
      422,
      "VALIDATION_ERROR",
      err.flatten().fieldErrors
    );
  }

  // 2) Custom application error (ApiError)
  if (err instanceof ApiError) {
    return apiError(err.message, err.statusCode, err.code, err.details);
  }

  // 3) Known Prisma error (unique constraint, not found, FK, etc.)
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002":
        return apiError(
          `Duplicate entry: field ${JSON.stringify(
            err.meta?.target
          )} is already in use.`,
          409,
          "DUPLICATE_ENTRY"
        );
      case "P2025":
        return apiError("Requested data not found.", 404, "NOT_FOUND");
      case "P2003":
        return apiError(
          "Operation failed due to related data (foreign key constraint).",
          409,
          "FOREIGN_KEY_CONSTRAINT"
        );
      default:
        return apiError(
          `Database error (${err.code}).`,
          500,
          "DATABASE_ERROR"
        );
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return apiError("Data provided is invalid for the database.", 400, "PRISMA_VALIDATION_ERROR");
  }

  // 4) Unexpected fallback
  console.error("[UNHANDLED_API_ERROR]", err);
  return apiError(
    process.env.NODE_ENV === "development"
      ? (err as Error)?.message ?? "An unexpected error occurred."
      : "A server error occurred. Please try again later.",
    500,
    "INTERNAL_SERVER_ERROR"
  );
}
