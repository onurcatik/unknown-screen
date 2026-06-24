import type { ApiErrorResponse, ApiSuccessResponse } from "@shared/model/api";
import { isApiClientError } from "@shared/api/errors";

export type ModelName = string;

export type ModelsResponse = ApiSuccessResponse<{
  models: ModelName[];
  default: ModelName;
}>;

export type ModelsErrorResponse = ApiErrorResponse<{
  models?: ModelName[];
  default?: ModelName;
}>;

export type ModelSelectOption = {
  value: ModelName;
  label: string;
  isDefault: boolean;
};

export function toModelOptions(response: ModelsResponse): ModelSelectOption[] {
  return response.models.map((model) => ({
    value: model,
    label: model,
    isDefault: model === response.default,
  }));
}

export function getModelFallbackFromError(error: unknown): ModelsResponse | null {
  if (!isApiClientError(error)) {
    return null;
  }

  const raw = error.raw as Partial<ModelsErrorResponse> | null | undefined;
  if (!raw || !Array.isArray(raw.models) || typeof raw.default !== "string") {
    return null;
  }

  return {
    status: "success",
    models: raw.models,
    default: raw.default,
  };
}
