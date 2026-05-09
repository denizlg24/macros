"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ChefHat, Flame, LoaderCircle, Plus, Search } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useDailyCalorieSummary } from "@/lib/app-cache/api"
import { foodLogQueryKeys } from "@/lib/app-cache/food-log-keys"
import { queryKeys } from "@/lib/app-cache/query-keys"
import {
  logRecipeResponseSchema,
  type RecipeSummary,
  recipesResponseSchema,
} from "@/lib/recipes/contracts"
import {
  dateFromIsoDate,
  getHourInTimezone,
  HeaderChips,
  inferMealType,
  NavTabs,
} from "../../add/_components/add-food-shared"

async function readJsonResponse(response: Response) {
  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`)
  }
  return response.json() as Promise<unknown>
}

async function fetchRecipes(signal?: AbortSignal) {
  const response = await fetch("/api/recipes", { signal, cache: "no-store" })
  return recipesResponseSchema.parse(await readJsonResponse(response))
}

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`
}

export function RecipesPageClient() {
  const queryClient = useQueryClient()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const { data: calorieSummary } = useDailyCalorieSummary()
  const [query, setQuery] = useState("")
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [selectedHour, setSelectedHour] = useState(() => new Date().getHours())
  const [loggingId, setLoggingId] = useState<string | null>(null)

  const recipesQuery = useQuery({
    queryKey: ["recipes"],
    queryFn: ({ signal }) => fetchRecipes(signal),
    staleTime: 60_000,
  })

  useEffect(() => {
    if (!calorieSummary) return
    setSelectedDate(dateFromIsoDate(calorieSummary.today))
    setSelectedHour(getHourInTimezone(new Date(), calorieSummary.timezone))
  }, [calorieSummary])

  useEffect(() => {
    document.documentElement.classList.add("macros-add-food-scroll-lock")
    return () => {
      document.documentElement.classList.remove("macros-add-food-scroll-lock")
    }
  }, [])

  useEffect(() => {
    const vv = window.visualViewport
    const el = containerRef.current
    if (!vv || !el) return

    function sync() {
      if (!el) return
      el.style.height = `${vv!.height}px`
      el.style.transform = `translateY(${vv!.offsetTop}px)`
    }

    sync()
    vv.addEventListener("resize", sync)
    vv.addEventListener("scroll", sync)

    return () => {
      vv.removeEventListener("resize", sync)
      vv.removeEventListener("scroll", sync)
    }
  }, [])

  const logDate = useMemo(() => toIsoDate(selectedDate), [selectedDate])
  const eatenAt = useMemo(() => {
    const d = new Date(selectedDate)
    d.setHours(selectedHour, 0, 0, 0)
    return d.toISOString()
  }, [selectedDate, selectedHour])

  const recipes = recipesQuery.data?.items ?? []
  const filteredRecipes = recipes.filter((recipe) =>
    recipe.name.toLowerCase().includes(query.trim().toLowerCase())
  )

  async function logRecipe(recipe: RecipeSummary) {
    if (!calorieSummary || loggingId !== null) return
    setLoggingId(recipe.id)
    try {
      const response = await fetch("/api/food-log/recipe-entries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          recipeId: recipe.id,
          servingsConsumed: 1,
          eatenAt,
          logDate,
          mealType: inferMealType(selectedHour),
        }),
      })
      const body = logRecipeResponseSchema.parse(
        await readJsonResponse(response)
      )
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.calorieSummary,
      })
      await queryClient.invalidateQueries({
        queryKey: foodLogQueryKeys.day(body.entry.logDate),
      })
      await queryClient.invalidateQueries({
        queryKey: ["food-log", "week-totals"],
      })
      toast.success("Recipe logged")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not log recipe"
      )
    } finally {
      setLoggingId(null)
    }
  }

  if (!calorieSummary) {
    return <RecipesLoading />
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-x-0 top-0 z-50 flex flex-col overflow-hidden bg-background"
    >
      <div className="flex-none bg-background">
        <HeaderChips
          selectedDate={selectedDate}
          selectedHour={selectedHour}
          todayDate={dateFromIsoDate(calorieSummary.today)}
          onDateChange={setSelectedDate}
          onHourChange={setSelectedHour}
          calorieSummary={calorieSummary}
          pendingCount={0}
          pendingCalories={0}
          onViewPending={() => undefined}
        />
        <NavTabs />
      </div>

      <div className="flex-none border-b border-border px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search recipes"
            className="h-11 rounded-full bg-muted pl-9 pr-3 text-base"
            enterKeyHint="search"
            autoComplete="off"
            inputMode="search"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain pb-24">
        <div className="flex items-baseline justify-between px-4 pt-4 pb-1">
          <h1 className="text-base font-semibold text-foreground">Recipes</h1>
          <span className="text-xs tabular-nums text-muted-foreground">
            {filteredRecipes.length} of {recipes.length}
          </span>
        </div>

        {recipesQuery.isLoading ? (
          <RecipeRowsLoading />
        ) : filteredRecipes.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <ChefHat className="mx-auto mb-3 size-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              {recipes.length === 0 ? "No recipes yet" : "No recipes found"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Build a plate, then save it as a recipe.
            </p>
          </div>
        ) : (
          filteredRecipes.map((recipe) => (
            <RecipeRow
              key={recipe.id}
              recipe={recipe}
              isLogging={loggingId === recipe.id}
              onLog={() => logRecipe(recipe)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function RecipeRow({
  recipe,
  isLogging,
  onLog,
}: {
  recipe: RecipeSummary
  isLogging: boolean
  onLog: () => void
}) {
  return (
    <div className="flex w-full items-center gap-2 border-b border-border/50 px-4 py-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <ChefHat className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-semibold leading-tight text-foreground">
          {recipe.name}
        </p>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 tabular-nums">
            {Math.round(recipe.caloriesPerServing)}
            <Flame className="size-3" />
          </span>
          <span className="tabular-nums">
            {Math.round(recipe.proteinPerServing)}P
          </span>
          <span className="tabular-nums">
            {Math.round(recipe.fatPerServing)}F
          </span>
          <span className="tabular-nums">
            {Math.round(recipe.carbsPerServing)}C
          </span>
          <span>-</span>
          <span>{recipe.ingredientCount} items</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onLog}
        disabled={isLogging}
        aria-label={`Log ${recipe.name}`}
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground disabled:opacity-50"
      >
        {isLogging ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Plus className="size-4" />
        )}
      </button>
    </div>
  )
}

function RecipesLoading() {
  return (
    <div className="flex h-dvh flex-col bg-background px-4 pt-4">
      <Skeleton className="mb-3 h-9 rounded-full" />
      <RecipeRowsLoading />
    </div>
  )
}

function RecipeRowsLoading() {
  return (
    <div>
      {[1, 2, 3, 4].map((item) => (
        <div
          key={item}
          className="flex items-center gap-2 border-b border-border/30 px-4 py-3"
        >
          <Skeleton className="size-9 rounded-md" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-10/12 rounded-full" />
            <Skeleton className="h-3 w-7/12 rounded-full" />
          </div>
          <Skeleton className="size-8 rounded-full" />
        </div>
      ))}
    </div>
  )
}
