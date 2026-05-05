export const queryKeys = {
  bootstrap: ["app", "bootstrap"] as const,
  dashboard: ["app", "dashboard"] as const,
  calorieSummary: ["app", "calorie-summary"] as const,
  foodHistory: (limit: number) => ["foods", "history", { limit }] as const,
}
