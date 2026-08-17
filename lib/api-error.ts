export class ApiError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(
    message: string,
    statusCode = 400,
    code = "BAD_REQUEST",
    details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(message = "Invalid request.", details?: unknown) {
    return new ApiError(message, 400, "BAD_REQUEST", details);
  }

  static unauthorized(message = "You are not logged in or your session has expired.") {
    return new ApiError(message, 401, "UNAUTHORIZED");
  }

  static forbidden(message = "You do not have permission for this action.") {
    return new ApiError(message, 403, "FORBIDDEN");
  }

  static notFound(message = "Data not found.") {
    return new ApiError(message, 404, "NOT_FOUND");
  }

  static conflict(message = "Data conflict occurred.") {
    return new ApiError(message, 409, "CONFLICT");
  }

  static unprocessable(message = "Data cannot be processed.", details?: unknown) {
    return new ApiError(message, 422, "UNPROCESSABLE_ENTITY", details);
  }

  static internal(message = "An internal server error occurred.") {
    return new ApiError(message, 500, "INTERNAL_SERVER_ERROR");
  }
}
