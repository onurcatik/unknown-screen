export type ApiStatus = "success" | "error";

export type ApiSuccessResponse<TPayload extends Record<string, unknown> = Record<string, unknown>> = {
  status: "success";
} & TPayload;

export type ApiErrorResponse<TExtra extends Record<string, unknown> = Record<string, unknown>> = {
  status: "error";
  message: string;
} & TExtra;

export type ApiEnvelope<TSuccess extends Record<string, unknown>, TErrorExtra extends Record<string, unknown> = Record<string, unknown>> =
  | ApiSuccessResponse<TSuccess>
  | ApiErrorResponse<TErrorExtra>;

export type ISODateString = string;
export type UUIDString = string;
export type RelativeBackendPath = string;
export type BackendFileUrl = string;
export type UnknownRecord = Record<string, unknown>;

export type FrontendApiError = {
  message: string;
  statusCode?: number;
  backendStatus?: "error";
  raw?: unknown;
};
