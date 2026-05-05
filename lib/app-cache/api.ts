"use client"

import {
  type QueryClient,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useEffect } from "react"
import type { FoodHistoryItem } from "@/lib/foods/contracts"
import type { DailyCalorieSummary } from "@/lib/queries/calorie-summary"
import type { DashboardData } from "@/lib/queries/dashboard"
import { queryKeys } from "./query-keys"

interface BootstrapResponse {
  dashboard: DashboardData
  calorieSummary: DailyCalorieSummary
  foodHistory: FoodHistoryItem[]
  fetchedAt: string
}

interface DashboardResponse {
  dashboard: DashboardData
  fetchedAt: string
}

interface CalorieSummaryResponse {
  calorieSummary: DailyCalorieSummary
  fetchedAt: string
}

interface FoodHistoryResponse {
  items: FoodHistoryItem[]
  fetchedAt: string
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" })

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`)
  }

  return response.json() as Promise<T>
}

export function useAppBootstrap() {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: queryKeys.bootstrap,
    queryFn: () => fetchJson<BootstrapResponse>("/api/app/bootstrap"),
    staleTime: 1000 * 60,
  })

  useEffect(() => {
    if (!query.data) return

    queryClient.setQueryData(queryKeys.dashboard, query.data.dashboard)
    queryClient.setQueryData(
      queryKeys.calorieSummary,
      query.data.calorieSummary
    )
    queryClient.setQueryData(queryKeys.foodHistory(20), {
      fetchedAt: query.data.fetchedAt,
      items: query.data.foodHistory,
    } satisfies FoodHistoryResponse)
  }, [query.data, queryClient])

  return query
}

export function useDashboardData() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: async () => {
      const body = await fetchJson<DashboardResponse>("/api/app/dashboard")
      return body.dashboard
    },
  })
}

export function useDailyCalorieSummary() {
  return useQuery({
    queryKey: queryKeys.calorieSummary,
    queryFn: async () => {
      const body = await fetchJson<CalorieSummaryResponse>(
        "/api/app/calorie-summary"
      )
      return body.calorieSummary
    },
  })
}

export function useFoodHistory(limit = 20) {
  return useQuery({
    queryKey: queryKeys.foodHistory(limit),
    queryFn: () =>
      fetchJson<FoodHistoryResponse>(`/api/foods/history?limit=${limit}`),
  })
}

export function setDashboardCaloriePreference(
  queryClient: QueryClient,
  caloriePreference: DashboardData["caloriePreference"]
) {
  queryClient.setQueryData<DashboardData>(queryKeys.dashboard, (current) =>
    current ? { ...current, caloriePreference } : current
  )
  queryClient.setQueryData<DailyCalorieSummary>(
    queryKeys.calorieSummary,
    (current) =>
      current ? { ...current, preference: caloriePreference } : current
  )
}

export function setTodayNutritionTotals(
  queryClient: QueryClient,
  logDate: string,
  totals: DashboardData["consumed"]
) {
  queryClient.setQueryData<DashboardData>(queryKeys.dashboard, (current) => {
    if (!current || current.today !== logDate) return current

    return {
      ...current,
      consumed: totals,
      energyBalance: current.energyBalance.map((point) =>
        point.date === logDate ? { ...point, consumed: totals.calories } : point
      ),
    }
  })
  queryClient.setQueryData<DailyCalorieSummary>(
    queryKeys.calorieSummary,
    (current) =>
      current && current.today === logDate
        ? { ...current, consumed: totals.calories }
        : current
  )
}
