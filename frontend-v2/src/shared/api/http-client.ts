import { env } from "@shared/config";
import type { ApiStatus } from "@shared/model/api";
import { ApiClientError } from "./errors";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  formData?: FormData;
  signal?: AbortSignal;
  headers?: HeadersInit;
};

type BackendEnvelope = {
  status?: ApiStatus;
  message?: string;
  [key: string]: unknown;
};

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function ensureLeadingSlash(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

export function getApiBaseUrl(): string {
  return trimTrailingSlash(env.apiBaseUrl || "http://localhost:8080");
}

export function createApiUrl(path: string): string {
  return `${getApiBaseUrl()}${ensureLeadingSlash(path)}`;
}

async function readJsonSafely(response: Response, method: HttpMethod): Promise<BackendEnvelope | null> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as BackendEnvelope;
  } catch (error) {
    throw new ApiClientError({
      message: "Backend returned a non-JSON response.",
      statusCode: response.status,
      endpoint: response.url,
      method,
      raw: { text, error },
    });
  }
}

export async function apiRequest<TResponse extends BackendEnvelope>(
  path: string,
  options: RequestOptions = {},
): Promise<TResponse> {
  const method = options.method ?? (options.body || options.formData ? "POST" : "GET");
  const url = createApiUrl(path);
  const headers = new Headers(options.headers);

  let body: BodyInit | undefined;
  if (options.formData) {
    body = options.formData;
  } else if (typeof options.body !== "undefined") {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.body);
  }

  headers.set("Accept", "application/json");

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      body,
      headers,
      signal: options.signal,
    });
  } catch (error) {
    throw new ApiClientError({
      message: "Backend connection failed.",
      statusCode: 0,
      endpoint: url,
      method,
      raw: error,
    });
  }

  const payload = await readJsonSafely(response, method);

  if (!response.ok || payload?.status === "error") {
    throw new ApiClientError({
      message: typeof payload?.message === "string" ? payload.message : `Request failed with HTTP ${response.status}.`,
      statusCode: response.status,
      backendStatus: payload?.status === "error" ? "error" : undefined,
      endpoint: url,
      method,
      raw: payload,
    });
  }

  if (!payload || payload.status !== "success") {
    throw new ApiClientError({
      message: "Backend response did not include a success status.",
      statusCode: response.status,
      endpoint: url,
      method,
      raw: payload,
    });
  }

  return payload as TResponse;
}

export function buildBackendFileUrl(relativePathOrUrl: string | null | undefined): string | null {
  if (!relativePathOrUrl) {
    return null;
  }

  if (/^https?:\/\//i.test(relativePathOrUrl)) {
    return relativePathOrUrl;
  }

  const normalized = relativePathOrUrl.replace(/\\/g, "/").replace(/^\/+/, "");
  if (normalized.startsWith("api/files/")) {
    return createApiUrl(`/${normalized}`);
  }

  if (normalized.startsWith("/api/files/")) {
    return createApiUrl(normalized);
  }

  return createApiUrl(`/api/files/${normalized}`);
}
