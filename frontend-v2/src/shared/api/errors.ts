import type { FrontendApiError } from "@shared/model/api";

export type ApiClientErrorInput = {
  message: string;
  statusCode?: number;
  backendStatus?: "error";
  endpoint?: string;
  method?: string;
  raw?: unknown;
};

export class ApiClientError extends Error implements FrontendApiError {
  readonly statusCode?: number;
  readonly backendStatus?: "error";
  readonly endpoint?: string;
  readonly method?: string;
  readonly raw?: unknown;

  constructor(input: ApiClientErrorInput) {
    super(input.message);
    this.name = "ApiClientError";
    this.statusCode = input.statusCode;
    this.backendStatus = input.backendStatus;
    this.endpoint = input.endpoint;
    this.method = input.method;
    this.raw = input.raw;
  }
}

export function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}

export function toApiError(error: unknown, fallbackMessage = "Request failed."): ApiClientError {
  if (isApiClientError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new ApiClientError({ message: error.message || fallbackMessage, raw: error });
  }

  return new ApiClientError({ message: fallbackMessage, raw: error });
}

export function getUserFacingApiError(error: unknown): string {
  const apiError = toApiError(error);
  if (apiError.statusCode === 0) {
    return "Backend connection failed. Check that the Flask API is running.";
  }
  return apiError.message;
}
