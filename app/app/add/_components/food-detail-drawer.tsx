"use client"

import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { Flame } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  type ExternalFoodNutrition,
  externalFoodNutritionSchema,
  type LogFoodInput,
} from "@/lib/foods/contracts"
import {
  type NutrientKey,
  nutrientDefinitionsInput,
} from "@/lib/foods/nutrients"
import {
  NUTRIENT_SECTIONS,
  NUTRIENT_UPPER_LIMITS,
  WHO_DAILY_VALUES,
} from "@/lib/foods/who-guidelines"
import type { DailyCalorieSummary } from "@/lib/queries/calorie-summary"
import { cn } from "@/lib/utils"

export type FoodSummary = {
  id: string
  name: string
  brand: string | null | undefined
  servingLabel: string | null | undefined
  caloriesPerServing: number | null | undefined
  proteinPerServing: number | null | undefined
  fatPerServing: number | null | undefined
  carbsPerServing: number | null | undefined
}

type Unit = "g" | "oz" | "serving"

function fmtAmount(v: number) {
  if (v === 0) return "0"
  if (v < 0.1) return v.toFixed(2)
  if (v < 10) return v.toFixed(1)
  return Math.round(v).toString()
}

function nutrientLabel(key: NutrientKey) {
  return nutrientDefinitionsInput.find((d) => d.key === key)?.label ?? key
}

function nutrientUnit(key: NutrientKey) {
  return nutrientDefinitionsInput.find((d) => d.key === key)?.unit ?? ""
}

function computeScale(
  qty: number,
  unit: Unit,
  servingQuantityGrams: number | null
): number {
  if (!Number.isFinite(qty) || qty <= 0) return 0
  if (unit === "serving") return qty
  const gramsPerServing = servingQuantityGrams ?? 100
  if (unit === "oz") return (qty * 28.3495) / gramsPerServing
  return qty / gramsPerServing
}

function macroCaloriePct(
  macro: "protein" | "fat" | "carbs",
  nutrients: Record<string, number>
): number {
  const kcal = nutrients["calories"] ?? 0
  if (kcal === 0) return 0
  const grams = nutrients[macro] ?? 0
  const factor = macro === "fat" ? 9 : 4
  return Math.round(((grams * factor) / kcal) * 100)
}

function impactPct(nutrientValue: number, target: number | null): number {
  if (!target || target === 0) return 0
  return Math.round((nutrientValue / target) * 100)
}

function getTargetForKey(
  key: NutrientKey,
  calorieSummary: DailyCalorieSummary
): number | null {
  if (key === "calories") return calorieSummary.target
  if (key === "protein") return calorieSummary.proteinTarget
  if (key === "carbs") return calorieSummary.carbsTarget
  if (key === "fat") return calorieSummary.fatTarget
  return WHO_DAILY_VALUES[key] ?? null
}

const SECTION_COLORS: Record<string, string> = {
  "Carb Breakdown": "#6a9e6a",
  "Fat Breakdown": "#b89a3c",
  Vitamins: "#8060b4",
  Minerals: "#b46890",
  "Protein & Amino Acids": "#b85c50",
  Other: "#5878b4",
}

const DEFAULT_SECTION_COLOR = "#888899"

function getSectionColor(title: string): string {
  return SECTION_COLORS[title] ?? DEFAULT_SECTION_COLOR
}

function MacroBadge({ pct, color }: { pct: number; color: string }) {
  return (
    <span
      className="inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-foreground"
      style={{ backgroundColor: color }}
    >
      {pct}%
    </span>
  )
}

function ImpactRing({
  pct,
  stroke,
  label,
}: {
  pct: number
  stroke: string
  label: string
}) {
  const r = 22
  const sw = 2.5
  const circ = 2 * Math.PI * r
  const dash = Math.min(pct / 100, 1) * circ

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative size-13">
        <svg
          viewBox="0 0 52 52"
          className="absolute inset-0 -rotate-90"
          aria-hidden
        >
          <circle
            cx="26"
            cy="26"
            r={r}
            fill="none"
            strokeWidth={sw}
            className="stroke-muted"
          />
          {dash > 0 && (
            <circle
              cx="26"
              cy="26"
              r={r}
              fill="none"
              strokeWidth={sw}
              stroke={stroke}
              strokeDasharray={`${dash} ${circ}`}
              strokeLinecap="round"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] font-semibold tabular-nums">{pct}%</span>
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  )
}

const PLANNED_MACRO_KEYS = new Set<NutrientKey>([
  "calories",
  "protein",
  "carbs",
  "fat",
])

function NutrientRow({
  nutrientKey,
  label,
  amount,
  target,
  unit,
  color,
}: {
  nutrientKey: NutrientKey
  label: string
  amount: number
  target: number | null
  unit: string
  color: string
}) {
  const isPlannedMacro = PLANNED_MACRO_KEYS.has(nutrientKey)
  const hasTarget = target != null && target > 0

  let barContent

  if (isPlannedMacro && hasTarget) {
    const fillPct = Math.min((amount / target) * 100, 100)
    const overflow = amount > target
    barContent = (
      <div className="mt-1.5 h-0.75 w-full overflow-hidden rounded-none bg-muted">
        <div
          className="h-full rounded-none transition-all"
          style={{
            width: `${fillPct}%`,
            backgroundColor: overflow ? "#c4834a" : color,
          }}
        />
      </div>
    )
  } else {
    const ul = NUTRIENT_UPPER_LIMITS[nutrientKey]
    const scale = ul ?? (hasTarget ? target * 3 : Math.max(amount * 1.5, 1))
    const fillPct = scale > 0 ? Math.min((amount / scale) * 100, 100) : 0
    const zonePct = hasTarget ? Math.min((target / scale) * 100, 100) : null
    barContent = (
      <div className="relative mt-1.5 h-0.75 w-full rounded-none bg-muted">
        {zonePct != null && (
          <div
            className="absolute top-0 h-full rounded-none"
            style={{
              width: `${zonePct}%`,
              backgroundColor: color,
              opacity: 0.25,
            }}
          />
        )}
        <div
          className="absolute top-0 h-full rounded-none"
          style={{ width: `${fillPct}%`, backgroundColor: color }}
        />
      </div>
    )
  }

  return (
    <div className="py-2">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-foreground">{label}</span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {fmtAmount(amount)} {unit}
        </span>
      </div>
      {barContent}
    </div>
  )
}

function ServingSelector({
  qty,
  unit,
  servingLabel,
  servingQuantityGrams,
  onChange,
}: {
  qty: string
  unit: Unit
  servingLabel: string | null
  servingQuantityGrams: number | null
  onChange: (qty: string, unit: Unit) => void
}) {
  const units: { id: Unit; label: string }[] = [
    { id: "g", label: "g" },
    { id: "oz", label: "oz" },
    ...(servingLabel ? [{ id: "serving" as Unit, label: servingLabel }] : []),
  ]

  const displayGrams = useMemo(() => {
    const n = parseFloat(qty)
    if (!Number.isFinite(n) || n <= 0 || !servingQuantityGrams) return null
    if (unit === "serving") return Math.round(n * servingQuantityGrams)
    if (unit === "oz") return Math.round(n * 28.3495)
    if (unit === "g") return Math.round(n)
    return null
  }, [qty, unit, servingQuantityGrams])

  return (
    <div className="space-y-2.5 px-4 py-3">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-4 py-2.5">
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.1"
          value={qty}
          onChange={(e) => onChange(e.target.value, unit)}
          className="min-w-0 flex-1 bg-transparent text-xl font-semibold text-foreground outline-none tabular-nums placeholder:text-muted-foreground"
          placeholder="Amount"
        />
        {servingLabel && unit === "serving" && displayGrams != null && (
          <span className="shrink-0 text-xs text-muted-foreground">
            {servingLabel} • {displayGrams} g
          </span>
        )}
      </div>
      <div className="flex gap-2">
        {units.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(qty, id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              unit === id
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

export interface FoodDetailDrawerProps {
  food: FoodSummary | null
  calorieSummary: DailyCalorieSummary
  eatenAt: string
  logDate: string
  mealType: "breakfast" | "lunch" | "dinner" | "snack"
  isLogging: boolean
  onClose: () => void
  onLog: (input: LogFoodInput, calories: number) => Promise<unknown>
}

export function FoodDetailDrawer({
  food,
  calorieSummary,
  eatenAt,
  logDate,
  mealType,
  isLogging,
  onClose,
  onLog,
}: FoodDetailDrawerProps) {
  const lastFood = useRef<FoodSummary | null>(null)
  if (food !== null) lastFood.current = food
  const displayFood = lastFood.current

  const [qty, setQty] = useState("1")
  const [unit, setUnit] = useState<Unit>("serving")
  const [nutrition, setNutrition] = useState<ExternalFoodNutrition | null>(null)
  const [isLoadingNutrition, setIsLoadingNutrition] = useState(false)

  useEffect(() => {
    if (!food) return
    let cancelled = false
    setIsLoadingNutrition(true)
    setNutrition(null)
    setQty("1")

    fetch(`/api/foods/${food.id}`)
      .then((r) => r.json())
      .then((body: unknown) => {
        if (cancelled) return
        const parsed = externalFoodNutritionSchema.safeParse(
          (body as { nutrition: unknown }).nutrition
        )
        if (parsed.success) {
          setNutrition(parsed.data)
          setUnit(parsed.data.servingLabel ? "serving" : "g")
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoadingNutrition(false)
      })

    return () => {
      cancelled = true
    }
  }, [food])

  const servingQuantityGrams = nutrition?.servingQuantity ?? null

  const scale = useMemo(() => {
    const n = parseFloat(qty)
    return computeScale(n, unit, servingQuantityGrams)
  }, [qty, unit, servingQuantityGrams])

  const scaledNutrients = useMemo<Record<string, number>>(() => {
    if (!displayFood) return {}
    if (!nutrition) {
      return {
        calories: (displayFood.caloriesPerServing ?? 0) * scale,
        protein: (displayFood.proteinPerServing ?? 0) * scale,
        fat: (displayFood.fatPerServing ?? 0) * scale,
        carbs: (displayFood.carbsPerServing ?? 0) * scale,
      }
    }
    return Object.fromEntries(
      Object.entries(nutrition.nutrients).map(([k, v]) => [k, v * scale])
    )
  }, [nutrition, scale, displayFood])

  const handleQtyUnitChange = useCallback((newQty: string, newUnit: Unit) => {
    setQty(newQty)
    setUnit(newUnit)
  }, [])

  const handleLog = useCallback(async () => {
    if (!displayFood) return
    await onLog(
      {
        sourceItemId: displayFood.id,
        servingsConsumed: scale > 0 ? scale : 1,
        eatenAt,
        logDate,
        mealType,
      },
      scaledNutrients["calories"] ?? 0
    )
    onClose()
  }, [
    displayFood,
    scale,
    scaledNutrients,
    eatenAt,
    logDate,
    mealType,
    onLog,
    onClose,
  ])

  const calories = scaledNutrients["calories"] ?? 0
  const protein = scaledNutrients["protein"] ?? 0
  const fat = scaledNutrients["fat"] ?? 0
  const carbs = scaledNutrients["carbs"] ?? 0

  const proteinPct = macroCaloriePct("protein", scaledNutrients)
  const fatPct = macroCaloriePct("fat", scaledNutrients)
  const carbsPct = macroCaloriePct("carbs", scaledNutrients)

  const calImpact = impactPct(calories, calorieSummary.target)
  const proteinImpact = impactPct(protein, calorieSummary.proteinTarget)
  const fatImpact = impactPct(fat, calorieSummary.fatTarget)
  const carbsImpact = impactPct(carbs, calorieSummary.carbsTarget)

  const servingLabel =
    nutrition?.servingLabel ?? displayFood?.servingLabel ?? null

  const displayName = displayFood
    ? displayFood.brand
      ? `${displayFood.name} By ${displayFood.brand}`
      : displayFood.name
    : ""

  return (
    <Drawer open={food !== null} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="flex h-[calc(100dvh-3rem)]! max-h-full! flex-col rounded-none">
        <VisuallyHidden>
          <DrawerTitle>{displayName}</DrawerTitle>
          <DrawerDescription>
            View nutrition info and add to your food log
          </DrawerDescription>
        </VisuallyHidden>

        <div className="flex-none border-b border-border px-4 py-3">
          <h2 className="truncate text-sm font-semibold text-foreground">
            {displayName}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-end gap-4">
              <div className="flex flex-col items-center">
                <span className="text-3xl font-bold tabular-nums text-foreground text-center mx-auto">
                  {fmtAmount(calories)}
                </span>
                <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <Flame className="size-3" />
                  <span>Calories</span>
                </div>
              </div>
              <div className="flex flex-1 items-end justify-around pb-0.5">
                <div className="flex flex-col items-center gap-1">
                  <MacroBadge pct={proteinPct} color="#b85c50" />
                  <span className="text-base font-semibold tabular-nums">
                    {fmtAmount(protein)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Protein
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <MacroBadge pct={fatPct} color="#b89a3c" />
                  <span className="text-base font-semibold tabular-nums">
                    {fmtAmount(fat)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Fat</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <MacroBadge pct={carbsPct} color="#6a9e6a" />
                  <span className="text-base font-semibold tabular-nums">
                    {fmtAmount(carbs)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Carbs
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 pb-3">
            <p className="mb-3 text-xs font-semibold text-foreground">
              Impact on Targets
            </p>
            <div className="flex justify-around">
              <ImpactRing pct={calImpact} stroke="#5878b4" label="Calories" />
              <ImpactRing
                pct={proteinImpact}
                stroke="#b85c50"
                label="Protein"
              />
              <ImpactRing pct={fatImpact} stroke="#b89a3c" label="Fat" />
              <ImpactRing pct={carbsImpact} stroke="#6a9e6a" label="Carbs" />
            </div>
          </div>

          {isLoadingNutrition ? (
            <div className="px-4 py-3">
              <div className="h-12 animate-pulse rounded-xl bg-muted" />
            </div>
          ) : (
            <ServingSelector
              qty={qty}
              unit={unit}
              servingLabel={servingLabel ?? null}
              servingQuantityGrams={servingQuantityGrams}
              onChange={handleQtyUnitChange}
            />
          )}

          <div className="mx-4 h-px bg-border" />

          {NUTRIENT_SECTIONS.map((section) => {
            const color = getSectionColor(section.title)
            const rows = section.keys
              .map((key) => {
                const raw = scaledNutrients[key]
                if (raw == null) return null
                return {
                  key,
                  label: nutrientLabel(key),
                  amount: raw,
                  target: getTargetForKey(key, calorieSummary),
                  unit: nutrientUnit(key),
                }
              })
              .filter((r) => r !== null)

            if (rows.length === 0) return null

            return (
              <section key={section.title} className="px-4 pt-4">
                <h3 className="mb-1 text-xs font-semibold">{section.title}</h3>
                <div className="divide-y divide-border/40">
                  {rows.map((row) => (
                    <NutrientRow
                      key={row.key}
                      nutrientKey={row.key}
                      label={row.label}
                      amount={row.amount}
                      target={row.target}
                      unit={row.unit}
                      color={color}
                    />
                  ))}
                </div>
              </section>
            )
          })}

          <div className="h-6" />
        </div>

        <div
          className="flex-none border-t border-border bg-background px-3 py-3"
          style={{
            paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)",
          }}
        >
          <button
            type="button"
            onClick={handleLog}
            disabled={isLogging}
            className="h-11 w-full rounded-2xl bg-foreground text-sm font-semibold text-background disabled:opacity-50"
          >
            {isLogging ? "Adding…" : "Add"}
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
