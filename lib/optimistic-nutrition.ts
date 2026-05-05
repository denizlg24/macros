"use client"

import { z } from "zod"
import type { DailyMacros } from "@/lib/queries/dashboard"

export type OptimisticDailyMacros = DailyMacros

interface OptimisticNutritionEntry {
  id: string
  batchId?: string
  logDate: string
  baseCalories?: number
  macros: OptimisticDailyMacros
}

const STORAGE_KEY = "macros.optimistic-nutrition.v1"
const EVENT_NAME = "macros:optimistic-nutrition"
const optimisticNutritionEntrySchema = z.object({
  id: z.string(),
  batchId: z.string().optional(),
  logDate: z.string(),
  baseCalories: z.number().optional(),
  macros: z.object({
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fat: z.number(),
  }),
})

function zeroMacros(): OptimisticDailyMacros {
  return { calories: 0, protein: 0, carbs: 0, fat: 0 }
}

function isEntry(value: unknown): value is OptimisticNutritionEntry {
  return optimisticNutritionEntrySchema.safeParse(value).success
}

function readEntries(): OptimisticNutritionEntry[] {
  if (typeof window === "undefined") return []

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isEntry) : []
  } catch {
    return []
  }
}

function writeEntries(entries: OptimisticNutritionEntry[]) {
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  window.dispatchEvent(new Event(EVENT_NAME))
}

export function addOptimisticNutritionEntry(entry: OptimisticNutritionEntry) {
  writeEntries([...readEntries(), entry])
}

export function removeOptimisticNutritionEntries(ids: string[]) {
  if (ids.length === 0) return
  const idSet = new Set(ids)
  writeEntries(readEntries().filter((entry) => !idSet.has(entry.id)))
}

export function getOptimisticNutritionForDate(
  logDate: string
): OptimisticDailyMacros {
  return readEntries()
    .filter((entry) => entry.logDate === logDate)
    .reduce((total, entry) => addMacros(total, entry.macros), zeroMacros())
}

export function pruneReconciledOptimisticNutritionEntries(
  logDate: string,
  serverCalories: number
) {
  const entries = readEntries()
  const batches = new Map<string, OptimisticNutritionEntry[]>()

  for (const entry of entries) {
    if (entry.logDate !== logDate || entry.baseCalories == null) {
      continue
    }

    const batchId = entry.batchId ?? entry.id
    batches.set(batchId, [...(batches.get(batchId) ?? []), entry])
  }

  const reconciledIds = new Set<string>()
  for (const batchEntries of batches.values()) {
    const baseCalories = batchEntries[0]?.baseCalories
    if (baseCalories == null) continue

    const batchCalories = batchEntries.reduce(
      (sum, entry) => sum + entry.macros.calories,
      0
    )

    if (serverCalories >= baseCalories + batchCalories) {
      for (const entry of batchEntries) {
        reconciledIds.add(entry.id)
      }
    }
  }

  if (reconciledIds.size === 0) return

  writeEntries(entries.filter((entry) => !reconciledIds.has(entry.id)))
}

export function subscribeToOptimisticNutrition(onStoreChange: () => void) {
  window.addEventListener(EVENT_NAME, onStoreChange)
  window.addEventListener("storage", onStoreChange)

  return () => {
    window.removeEventListener(EVENT_NAME, onStoreChange)
    window.removeEventListener("storage", onStoreChange)
  }
}

export function addMacros(
  left: OptimisticDailyMacros,
  right: OptimisticDailyMacros
): OptimisticDailyMacros {
  return {
    calories: left.calories + right.calories,
    protein: left.protein + right.protein,
    carbs: left.carbs + right.carbs,
    fat: left.fat + right.fat,
  }
}
