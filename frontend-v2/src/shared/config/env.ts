export const env = {
  appName: import.meta.env.VITE_APP_NAME ?? "UnknownScreen Studio",
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080",
} as const;
