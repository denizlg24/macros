"use client"

import { useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Flame, LoaderCircle, Save, Trash2 } from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useDailyCalorieSummary } from "@/lib/app-cache/api"
import { queryKeys } from "@/lib/app-cache/query-keys"
import {
  readPendingFoods,
  subscribeToPendingFoods,
  writePendingFoods,
} from "@/lib/foods/pending-foods"
import { createRecipeResponseSchema } from "@/lib/recipes/contracts"
import {
  dateFromIsoDate,
  formatHourLabel,
  getHourInTimezone,
  getPendingCalories,
  HeaderChips,
  inferMealType,
  NavTabs,
  type PendingFood,
} from "../../add/_components/add-food-shared"
import { useLogPendingFoods } from "../../add/_components/use-log-pending-foods"

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`
}

async function readJsonResponse(response: Response) {
  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`)
  }
  return response.json() as Promise<unknown>
}

export function PlatePageClient() {
  const queryClient = useQueryClient()
  const { data } = useDailyCalorieSummary()
  const [pendingFoods, setPendingFoods] = useState<PendingFood[]>([])
  const [extraConsumed, setExtraConsumed] = useState(0)
  const [, setPendingSheetOpen] = useState(false)
  const [recipeDialogOpen, setRecipeDialogOpen] = useState(false)
  const [recipeName, setRecipeName] = useState("")
  const [isSavingRecipe, setIsSavingRecipe] = useState(false)
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [selectedHour, setSelectedHour] = useState(() => new Date().getHours())

  useEffect(() => {
    setPendingFoods(readPendingFoods())
    return subscribeToPendingFoods(setPendingFoods)
  }, [])

  useEffect(() => {
    if (!data) return
    setSelectedDate(dateFromIsoDate(data.today))
    setSelectedHour(getHourInTimezone(new Date(), data.timezone))
  }, [data])

  const logDate = useMemo(() => toIsoDate(selectedDate), [selectedDate])
  const eatenAt = useMemo(() => {
    const d = new Date(selectedDate)
    d.setHours(selectedHour, 0, 0, 0)
    return d.toISOString()
  }, [selectedDate, selectedHour])

  const foodsForLog = useMemo(
    () =>
      pendingFoods.map((food) => ({
        ...food,
        input: {
          ...food.input,
          eatenAt,
          logDate,
          mealType: inferMealType(selectedHour),
        },
      })),
    [eatenAt, logDate, pendingFoods, selectedHour]
  )

  const totals = pendingFoods.reduce(
    (acc, food) => ({
      calories: acc.calories + food.macros.calories,
      protein: acc.protein + food.macros.protein,
      fat: acc.fat + food.macros.fat,
      carbs: acc.carbs + food.macros.carbs,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  )

  const { isCommitting, logAllPending } = useLogPendingFoods({
    pendingFoods: foodsForLog,
    setPendingFoods,
    setPendingSheetOpen,
    setExtraConsumed,
    today: data?.today ?? logDate,
  })

  function removePending(uid: string) {
    setPendingFoods((current) => {
      const next = current.filter((food) => food.uid !== uid)
      window.queueMicrotask(() => writePendingFoods(next))
      return next
    })
  }

  async function saveRecipe() {
    const name = recipeName.trim()
    if (!name) {
      toast.error("Recipe name is required")
      return
    }
    if (pendingFoods.length === 0) return

    setIsSavingRecipe(true)
    try {
      const response = await fetch("/api/recipes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          ingredients: pendingFoods.map((food) => ({
            sourceItemId: food.input.sourceItemId,
            servingsConsumed: food.input.servingsConsumed,
          })),
        }),
      })
      createRecipeResponseSchema.parse(await readJsonResponse(response))
      writePendingFoods([])
      setPendingFoods([])
      setRecipeDialogOpen(false)
      setRecipeName("")
      await queryClient.invalidateQueries({
        queryKey: queryKeys.calorieSummary,
      })
      await queryClient.invalidateQueries({ queryKey: ["recipes"] })
      toast.success("Recipe saved")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save recipe"
      )
    } finally {
      setIsSavingRecipe(false)
    }
  }

  if (!data) {
    return <PlateLoading />
  }

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex h-dvh flex-col overflow-hidden bg-background">
      <div className="flex-none bg-background">
        <HeaderChips
          selectedDate={selectedDate}
          selectedHour={selectedHour}
          todayDate={dateFromIsoDate(data.today)}
          onDateChange={setSelectedDate}
          onHourChange={setSelectedHour}
          calorieSummary={{
            ...data,
            consumed: data.consumed + extraConsumed,
          }}
          pendingCount={pendingFoods.length}
          pendingCalories={0}
          onViewPending={() => undefined}
        />
        <NavTabs />
      </div>

      <div className="flex flex-none items-center gap-3 border-b border-border px-4 py-3">
        <Button asChild type="button" variant="ghost" size="icon">
          <Link href="/app/add" aria-label="Back to search">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold">Plate</h1>
          <p className="text-xs text-muted-foreground">
            {formatHourLabel(selectedHour)} on {logDate}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        <div className="mb-4 grid grid-cols-4 gap-2 rounded-xl bg-muted/40 p-3 text-center">
          <Macro label="kcal" value={totals.calories} />
          <Macro label="P" value={totals.protein} />
          <Macro label="F" value={totals.fat} />
          <Macro label="C" value={totals.carbs} />
        </div>

        {pendingFoods.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-medium">Your plate is empty</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add foods from search or the library.
            </p>
          </div>
        ) : (
          pendingFoods.map((food) => (
            <div
              key={food.uid}
              className="flex items-center gap-3 border-b border-border/50 py-3"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <Flame className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {food.food.brand
                    ? `${food.food.name} By ${food.food.brand}`
                    : food.food.name}
                </p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {Math.round(getPendingCalories(food))} kcal -{" "}
                  {food.input.servingsConsumed.toFixed(
                    food.input.servingsConsumed % 1 === 0 ? 0 : 1
                  )}{" "}
                  serving
                </p>
              </div>
              <button
                type="button"
                onClick={() => removePending(food.uid)}
                aria-label="Remove from plate"
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))
        )}
      </div>

      <div
        className="flex flex-none gap-2 border-t border-border bg-background px-3 py-3"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)" }}
      >
        <Button
          type="button"
          variant="outline"
          disabled={pendingFoods.length === 0 || isSavingRecipe}
          onClick={() => setRecipeDialogOpen(true)}
          className="h-11 flex-1 rounded-full"
        >
          <Save className="size-4" />
          Recipe
        </Button>
        <Button
          type="button"
          disabled={pendingFoods.length === 0 || isCommitting}
          onClick={logAllPending}
          className="h-11 flex-1 rounded-full bg-foreground text-background hover:bg-foreground/90"
        >
          {isCommitting ? "Logging..." : "Log Plate"}
        </Button>
      </div>

      <Dialog open={recipeDialogOpen} onOpenChange={setRecipeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Name recipe</DialogTitle>
          </DialogHeader>
          <Input
            value={recipeName}
            onChange={(event) => setRecipeName(event.target.value)}
            placeholder="Recipe name"
            autoComplete="off"
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRecipeDialogOpen(false)}
              disabled={isSavingRecipe}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={saveRecipe}
              disabled={isSavingRecipe}
            >
              {isSavingRecipe ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  Saving
                </>
              ) : (
                "Save Recipe"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Macro({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-lg font-semibold tabular-nums">{Math.round(value)}</p>
      <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
    </div>
  )
}

function PlateLoading() {
  return (
    <div className="flex h-dvh flex-col bg-background">
      <div className="px-3 pt-3 pb-2">
        <Skeleton className="h-9 w-full rounded-full" />
      </div>
      <div className="px-4 py-4">
        <Skeleton className="mb-4 h-20 rounded-xl" />
        {[1, 2, 3].map((item) => (
          <Skeleton key={item} className="mb-3 h-14 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
