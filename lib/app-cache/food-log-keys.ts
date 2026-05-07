export const foodLogQueryKeys = {
  day: (date: string) => ["food-log", "day", date] as const,
  overview: (range: string) => ["food-log", "overview", range] as const,
}
