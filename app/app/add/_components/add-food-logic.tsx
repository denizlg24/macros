"use client"

import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import {
  Barcode,
  BookOpen,
  ChefHat,
  Flame,
  Plus,
  Search as SearchIcon,
  X,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  type ChangeEvent,
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import {
  type FoodHistoryItem,
  type FoodSearchItem,
  type FoodSearchParams,
  foodHistoryResponseSchema,
  foodRevalidateResponseSchema,
  foodSearchParamsSchema,
  foodSearchResponseSchema,
  type LogFoodInput,
  logFoodResponseSchema,
} from "@/lib/foods/contracts"
import type { DailyCalorieSummary } from "@/lib/queries/calorie-summary"
import { cn } from "@/lib/utils"
import {
  getCachedFoodSearch,
  putCachedFoodSearch,
  updateCachedFoodItems,
} from "../_lib/food-search-cache"

interface FoodSearchState {
  query: string
  timePicks: FoodHistoryItem[]
  history: FoodHistoryItem[]
  results: FoodSearchItem[]
  isLoadingHistory: boolean
  isSearching: boolean
  isLogging: boolean
  showingCachedResults: boolean
  error: string | null
  fetchedAt: string | null
}

async function readJsonResponse(response: Response) {
  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`)
  }

  const body: unknown = await response.json()
  return body
}

function getHourInTimezone(date: Date, timezone: string) {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: timezone,
    }).format(date)
  )

  return Number.isFinite(hour) ? hour : date.getHours()
}

function dateFromIsoDate(value: string) {
  const parts = value.split("-")
  const year = Number(parts[0])
  const month = Number(parts[1])
  const day = Number(parts[2])

  if (!year || !month || !day) {
    const fallback = new Date()
    fallback.setHours(0, 0, 0, 0)
    return fallback
  }

  return new Date(year, month - 1, day)
}

function formatHourLabel(hour: number) {
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  const suffix = hour < 12 ? "AM" : "PM"
  return `${h12} ${suffix}`
}

function getSearchParams(query: string): FoodSearchParams | null {
  const parsed = foodSearchParamsSchema.safeParse({
    q: query.trim() || undefined,
    limit: 50,
  })

  return parsed.success ? parsed.data : null
}

export function useAddFoodLogic() {
  const requestSeq = useRef(0)
  const [state, setState] = useState<FoodSearchState>({
    query: "",
    timePicks: [],
    history: [],
    results: [],
    isLoadingHistory: true,
    isSearching: false,
    isLogging: false,
    showingCachedResults: false,
    error: null,
    fetchedAt: null,
  })

  const loadHistory = useCallback(async () => {
    setState((current) => ({
      ...current,
      isLoadingHistory: true,
      error: null,
    }))

    try {
      const [picksRes, historyRes] = await Promise.all([
        fetch("/api/foods/history?limit=5", { cache: "no-store" }),
        fetch(`/api/foods/history?limit=20`, { cache: "no-store" }),
      ])

      const picksBody = foodHistoryResponseSchema.parse(
        await readJsonResponse(picksRes)
      )
      const historyBody = foodHistoryResponseSchema.parse(
        await readJsonResponse(historyRes)
      )

      setState((current) => ({
        ...current,
        timePicks: picksBody.items,
        history: historyBody.items,
        isLoadingHistory: false,
      }))
    } catch (error) {
      setState((current) => ({
        ...current,
        isLoadingHistory: false,
        error:
          error instanceof Error ? error.message : "Failed to load history",
      }))
    }
  }, [])

  const revalidateCachedItems = useCallback(
    async (itemIds: string[], activeRequest: number) => {
      if (itemIds.length === 0) {
        return
      }

      const response = await fetch("/api/foods/revalidate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ itemIds }),
      })
      const body = foodRevalidateResponseSchema.parse(
        await readJsonResponse(response)
      )
      const items = body.items.map((result) => result.item)

      await updateCachedFoodItems(items, body.fetchedAt)

      if (requestSeq.current === activeRequest) {
        setState((current) => ({
          ...current,
          results: current.results.map(
            (item) => items.find((updated) => updated.id === item.id) ?? item
          ),
          fetchedAt: body.fetchedAt,
        }))
      }
    },
    []
  )

  const searchFoods = useCallback(
    async (query: string) => {
      const params = getSearchParams(query)
      const activeRequest = requestSeq.current + 1
      requestSeq.current = activeRequest

      setState((current) => ({
        ...current,
        query,
        isSearching: !!params,
        showingCachedResults: false,
        results: params ? current.results : [],
        error: null,
      }))

      if (!params) {
        return
      }

      const cached = await getCachedFoodSearch(params)
      if (cached && requestSeq.current === activeRequest) {
        setState((current) => ({
          ...current,
          results: cached.items,
          showingCachedResults: true,
          fetchedAt: cached.fetchedAt,
        }))

        revalidateCachedItems(cached.itemIds, activeRequest).catch(() => {})
      }

      try {
        const url = new URL("/api/foods/search", window.location.origin)
        url.searchParams.set("q", params.q ?? "")
        url.searchParams.set("limit", params.limit.toString())

        const response = await fetch(url, { cache: "no-store" })
        const body = foodSearchResponseSchema.parse(
          await readJsonResponse(response)
        )

        await putCachedFoodSearch(params, body.items, body.fetchedAt)

        if (requestSeq.current === activeRequest) {
          setState((current) => ({
            ...current,
            results: body.items,
            isSearching: false,
            showingCachedResults: false,
            fetchedAt: body.fetchedAt,
          }))
        }
      } catch (error) {
        if (requestSeq.current === activeRequest) {
          setState((current) => ({
            ...current,
            isSearching: false,
            error:
              error instanceof Error ? error.message : "Failed to search foods",
          }))
        }
      }
    },
    [revalidateCachedItems]
  )

  const logFood = useCallback(
    async (input: LogFoodInput) => {
      setState((current) => ({ ...current, isLogging: true, error: null }))

      try {
        const response = await fetch("/api/food-log/entries", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input),
        })
        const body = logFoodResponseSchema.parse(
          await readJsonResponse(response)
        )
        await loadHistory()

        setState((current) => ({ ...current, isLogging: false }))
        return body.entry
      } catch (error) {
        setState((current) => ({
          ...current,
          isLogging: false,
          error: error instanceof Error ? error.message : "Failed to log food",
        }))
        return null
      }
    },
    [loadHistory]
  )

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  return useMemo(
    () => ({
      ...state,
      searchFoods,
      logFood,
      refreshHistory: loadHistory,
    }),
    [state, searchFoods, logFood, loadHistory]
  )
}

type SearchableItem = Pick<
  FoodSearchItem,
  | "id"
  | "name"
  | "brand"
  | "servingLabel"
  | "caloriesPerServing"
  | "proteinPerServing"
  | "carbsPerServing"
  | "fatPerServing"
>

function fmtMacro(value: number | null) {
  if (value == null) return "0"
  return Math.round(value).toString()
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  const trimmed = query.trim()
  if (!trimmed) return <span className="font-semibold">{text}</span>

  const regex = new RegExp(
    `(${trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "gi"
  )
  const matchRegex = new RegExp(
    `^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
    "i"
  )
  const parts = text.split(regex).map((part, index) => ({
    key: `${index}-${part}`,
    part,
    matched: matchRegex.test(part),
  }))
  return (
    <span>
      {parts.map(({ key, part, matched }) => (
        <span key={key} className={matched ? "font-semibold" : "font-normal"}>
          {part}
        </span>
      ))}
    </span>
  )
}

function FoodRow({
  item,
  query,
  highlightOnly = false,
}: {
  item: SearchableItem
  query: string
  highlightOnly?: boolean
}) {
  const displayName = item.brand ? `${item.name} By ${item.brand}` : item.name
  return (
    <div className="flex items-center gap-3 border-b border-border/50 px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="text-[15px] leading-tight text-foreground">
          {highlightOnly ? (
            <HighlightedText text={displayName} query={query} />
          ) : (
            <span className="font-semibold">{displayName}</span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 tabular-nums">
            {fmtMacro(item.caloriesPerServing)}
            <Flame className="size-3" />
          </span>
          <span className="tabular-nums">
            {fmtMacro(item.proteinPerServing)}P
          </span>
          <span className="tabular-nums">{fmtMacro(item.fatPerServing)}F</span>
          <span className="tabular-nums">
            {fmtMacro(item.carbsPerServing)}C
          </span>
          {item.servingLabel ? (
            <>
              <span>•</span>
              <span className="truncate">{item.servingLabel}</span>
            </>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        aria-label="Add"
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
      >
        <Plus className="size-4" />
      </button>
    </div>
  )
}

function Section({
  title,
  items,
  query,
  highlightOnly = false,
  cap = 4,
}: {
  title: string
  items: SearchableItem[]
  query: string
  highlightOnly?: boolean
  cap?: number
}) {
  const [expanded, setExpanded] = useState(false)
  if (items.length === 0) return null

  const visible = expanded ? items : items.slice(0, cap)
  const remaining = items.length - cap

  return (
    <section className="pt-2">
      <header className="flex items-baseline justify-between px-4 pt-2 pb-1">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {!expanded && remaining > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="text-sm text-muted-foreground underline underline-offset-2"
          >
            See {remaining} More
          </button>
        ) : null}
      </header>
      <div>
        {visible.map((item) => (
          <FoodRow
            key={item.id}
            item={item}
            query={query}
            highlightOnly={highlightOnly}
          />
        ))}
      </div>
    </section>
  )
}

const NAV_TABS = [
  { href: "/app/scan", label: "Scan", Icon: Barcode },
  { href: "/app/add", label: "Search", Icon: SearchIcon },
  { href: "/app/recipes", label: "Recipes", Icon: ChefHat },
  { href: "/app/foods", label: "Library", Icon: BookOpen },
] as const

function CaloriePill({
  consumed,
  target,
  fillRatio,
}: {
  consumed: number
  target: number | null
  fillRatio: number
}) {
  const W = 98
  const H = 38
  const SW = 3
  const p = SW / 2 + 0.5
  const rw = W - SW
  const rh = H - SW
  const rx = rh / 2

  const perimeter = 2 * (rw - rh) + Math.PI * rh

  const startOffset = rw / 2 - rx
  const fillLength = Math.min(fillRatio, 1) * perimeter
  const targetLabel = target != null ? Math.round(target) : "—"

  return (
    <div className="relative" style={{ width: W, height: H }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        className="absolute inset-0"
        aria-hidden="true"
      >
        <rect
          x={p}
          y={p}
          width={rw}
          height={rh}
          rx={rx}
          className="fill-muted"
        />
        <rect
          x={p}
          y={p}
          width={rw}
          height={rh}
          rx={rx}
          fill="none"
          className="stroke-border"
          strokeWidth={SW}
        />
        {fillLength > 0 && (
          <rect
            x={p}
            y={p}
            width={rw}
            height={rh}
            rx={rx}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={SW}
            strokeDasharray={`${fillLength} ${perimeter}`}
            strokeDashoffset={-startOffset}
            strokeLinecap="round"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-medium tabular-nums text-foreground whitespace-nowrap">
          {Math.round(consumed)} / {targetLabel}
        </span>
      </div>
    </div>
  )
}

const DRUM_ITEM_H = 44
const DRUM_VISIBLE = 5
const DRUM_PADDING = Math.floor(DRUM_VISIBLE / 2)

function DrumColumn({
  count,
  selectedIndex,
  onSelect,
  getLabel,
}: {
  count: number
  selectedIndex: number
  onSelect: (index: number) => void
  getLabel: (index: number) => string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  useLayoutEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = selectedIndex * DRUM_ITEM_H
    }
  }, [selectedIndex])

  useEffect(() => {
    if (!ref.current) return
    const target = selectedIndex * DRUM_ITEM_H
    if (Math.abs(ref.current.scrollTop - target) > 2) {
      ref.current.scrollTo({ top: target, behavior: "smooth" })
    }
  }, [selectedIndex])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    function handleScrollEnd() {
      const idx = Math.round(el!.scrollTop / DRUM_ITEM_H)
      onSelectRef.current(Math.max(0, Math.min(idx, count - 1)))
    }
    el.addEventListener("scrollend", handleScrollEnd)
    return () => el.removeEventListener("scrollend", handleScrollEnd)
  }, [count])

  return (
    <div
      className="relative flex-1 overflow-hidden"
      style={{ height: DRUM_VISIBLE * DRUM_ITEM_H }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 border-y border-border/60"
        style={{ top: DRUM_PADDING * DRUM_ITEM_H, height: DRUM_ITEM_H }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-linear-to-b from-background to-transparent"
        style={{ height: DRUM_PADDING * DRUM_ITEM_H }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-linear-to-t from-background to-transparent"
        style={{ height: DRUM_PADDING * DRUM_ITEM_H }}
      />
      <div
        ref={ref}
        className="h-full overflow-y-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          scrollSnapType: "y mandatory",
          paddingTop: DRUM_PADDING * DRUM_ITEM_H,
          paddingBottom: DRUM_PADDING * DRUM_ITEM_H,
        }}
      >
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            style={{ scrollSnapAlign: "center", height: DRUM_ITEM_H }}
            className={cn(
              "flex items-center justify-center text-sm font-medium transition-colors",
              i === selectedIndex
                ? "text-foreground"
                : "text-muted-foreground/50"
            )}
          >
            {getLabel(i)}
          </div>
        ))}
      </div>
    </div>
  )
}

function HeaderChips({
  selectedDate,
  selectedHour,
  todayDate,
  onDateChange,
  onHourChange,
  calorieSummary,
}: {
  selectedDate: Date
  selectedHour: number
  todayDate: Date
  onDateChange: (date: Date) => void
  onHourChange: (hour: number) => void
  calorieSummary: DailyCalorieSummary
}) {
  const [timeDrawerOpen, setTimeDrawerOpen] = useState(false)
  const { consumed, target } = calorieSummary

  const dates = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const d = new Date(todayDate)
        d.setDate(todayDate.getDate() - (13 - i))
        return d
      }),
    [todayDate]
  )

  const selectedDateIndex = dates.findIndex(
    (d) => d.getTime() === selectedDate.getTime()
  )

  function getDateLabel(i: number) {
    const d = dates[i]
    if (!d) return ""
    if (d.getTime() === todayDate.getTime()) return "Today"
    return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" })
  }

  const fillRatio =
    target != null && target > 0 ? Math.min(consumed / target, 1) : 0

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 pt-3 pb-2">
      <div className="flex items-center gap-2">
        <Link
          href="/app"
          aria-label="Close"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
        >
          <X className="size-4" />
        </Link>
        <Drawer open={timeDrawerOpen} onOpenChange={setTimeDrawerOpen}>
          <DrawerTrigger asChild>
            <button
              type="button"
              className="h-9 shrink-0 rounded-full bg-muted px-4 text-xs font-medium text-foreground"
            >
              {formatHourLabel(selectedHour)}
            </button>
          </DrawerTrigger>
          <DrawerContent className="pb-safe">
            <VisuallyHidden>
              <DrawerTitle>Select time</DrawerTitle>
              <DrawerDescription>
                Choose the date and time for this log entry.
              </DrawerDescription>
            </VisuallyHidden>
            <div className="flex items-center justify-between px-5 pt-5 pb-2">
              <p className="text-base font-semibold">When</p>
              <button
                type="button"
                onClick={() => setTimeDrawerOpen(false)}
                className="text-sm font-medium text-accent"
              >
                Done
              </button>
            </div>
            <div className="flex gap-2 px-4 pb-4">
              <DrumColumn
                count={dates.length}
                selectedIndex={Math.max(0, selectedDateIndex)}
                onSelect={(i) => onDateChange(dates[i]!)}
                getLabel={getDateLabel}
              />
              <div className="w-px bg-border/40 self-stretch" />
              <DrumColumn
                count={24}
                selectedIndex={selectedHour}
                onSelect={onHourChange}
                getLabel={(i) => formatHourLabel(i)}
              />
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      <div className="flex justify-center">
        <CaloriePill
          consumed={consumed}
          target={target}
          fillRatio={fillRatio}
        />
      </div>
    </div>
  )
}

function NavTabs() {
  const pathname = usePathname()

  return (
    <nav className="flex items-stretch border-b border-border">
      {NAV_TABS.map(({ href, label, Icon }) => {
        const isActive = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "relative flex flex-1 items-center justify-center gap-1.5 py-3 text-sm",
              isActive ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <Icon className="size-4" />
            <span className="whitespace-nowrap">{label}</span>
            {isActive ? (
              <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-foreground" />
            ) : null}
          </Link>
        )
      })}
    </nav>
  )
}

function matchesQuery(item: SearchableItem, q: string) {
  const needle = q.trim().toLowerCase()
  if (!needle) return false
  return (
    item.name.toLowerCase().includes(needle) ||
    (item.brand?.toLowerCase().includes(needle) ?? false)
  )
}

function dedupeById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>()
  const out: T[] = []
  for (const item of items) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    out.push(item)
  }
  return out
}

export function AddFoodLogic({
  calorieSummary,
}: {
  calorieSummary: DailyCalorieSummary
}) {
  const logic = useAddFoodLogic()
  const [draft, setDraft] = useState("")
  const inputRef = useRef<HTMLInputElement | null>(null)
  const todayDate = useMemo(
    () => dateFromIsoDate(calorieSummary.today),
    [calorieSummary.today]
  )

  useEffect(() => {
    const handle = setTimeout(() => {
      logic.searchFoods(draft)
    }, 200)
    return () => clearTimeout(handle)
  }, [draft, logic.searchFoods])

  const onChange = (e: ChangeEvent<HTMLInputElement>) =>
    setDraft(e.target.value)

  const trimmed = draft.trim()
  const hasQuery = trimmed.length > 0

  const [selectedDate, setSelectedDate] = useState(() =>
    dateFromIsoDate(calorieSummary.today)
  )
  const [selectedHour, setSelectedHour] = useState(() =>
    getHourInTimezone(new Date(), calorieSummary.timezone)
  )
  const hourLabel = formatHourLabel(selectedHour)

  const fromHistory = useMemo(() => {
    if (!hasQuery) return []
    const combined = dedupeById([...logic.timePicks, ...logic.history])
    return combined.filter((item) => matchesQuery(item, trimmed))
  }, [hasQuery, trimmed, logic.timePicks, logic.history])

  const historyIds = useMemo(
    () => new Set(fromHistory.map((item) => item.id)),
    [fromHistory]
  )

  const common = useMemo(
    () =>
      logic.results.filter(
        (item) => item.brand === null && !historyIds.has(item.id)
      ),
    [logic.results, historyIds]
  )

  const branded = useMemo(
    () =>
      logic.results.filter(
        (item) => item.brand !== null && !historyIds.has(item.id)
      ),
    [logic.results, historyIds]
  )

  const picks = logic.timePicks.slice(0, 5)
  const latest = logic.history

  return (
    <div className="fixed inset-0 z-50 flex h-dvh flex-col bg-background">
      <div className="flex-none">
        <HeaderChips
          selectedDate={selectedDate}
          selectedHour={selectedHour}
          todayDate={todayDate}
          onDateChange={setSelectedDate}
          onHourChange={setSelectedHour}
          calorieSummary={calorieSummary}
        />
        <NavTabs />
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain pb-2">
        {hasQuery ? (
          <Fragment>
            <Section
              title="From History"
              items={fromHistory}
              query={trimmed}
              highlightOnly
            />
            <Section
              title="Common"
              items={common}
              query={trimmed}
              highlightOnly
            />
            <Section
              title="Branded"
              items={branded}
              query={trimmed}
              highlightOnly
            />
            {!logic.isSearching &&
            fromHistory.length === 0 &&
            common.length === 0 &&
            branded.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No foods found for &ldquo;{trimmed}&rdquo;.
              </p>
            ) : null}
          </Fragment>
        ) : (
          <Fragment>
            <Section
              title={`${hourLabel} Picks`}
              items={picks}
              query=""
              cap={5}
            />
            <Section title="Latest" items={latest} query="" cap={20} />
            {!logic.isLoadingHistory &&
            picks.length === 0 &&
            latest.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Log a food to start building your history.
              </p>
            ) : null}
          </Fragment>
        )}
      </div>

      <div
        className="flex-none border-t border-border bg-background px-3 py-3"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)" }}
      >
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={draft}
              onChange={onChange}
              placeholder="Search for a food"
              className="h-11 rounded-full bg-muted pl-9 pr-3 text-base"
              enterKeyHint="search"
              autoComplete="off"
              inputMode="search"
            />
          </div>
          <Button
            type="button"
            className="h-11 shrink-0 rounded-full bg-foreground px-5 text-background hover:bg-foreground/90"
          >
            Log Foods
          </Button>
        </div>
      </div>
    </div>
  )
}
