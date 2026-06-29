import { AppError } from "../../shared/errors/app-error.js";

export function invalidCredentialsError(): AppError {
  return new AppError({
    code: "AUTHENTICATION_REQUIRED",
    message: "Invalid email or password",
    statusCode: 401,
  });
}

export function invalidRefreshTokenError(): AppError {
  return new AppError({
    code: "AUTHENTICATION_REQUIRED",
    message: "Invalid refresh token",
    statusCode: 401,
  });
}

export function authenticationRequiredError(): AppError {
  return new AppError({
    code: "AUTHENTICATION_REQUIRED",
    message: "Authentication required",
    statusCode: 401,
  });
}

export function permissionDeniedError(): AppError {
  return new AppError({
    code: "PERMISSION_DENIED",
    message: "Permission denied",
    statusCode: 403,
  });
}
