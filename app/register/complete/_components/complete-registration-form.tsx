"use client"

import { ArrowLeft, ArrowRight, LoaderCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

type WeightUnit = "kg" | "lb"
type EnergyUnit = "kcal" | "kj"
type Sex = "female" | "male" | "other" | "prefer_not_to_say"
type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active"
type GoalType = "lose" | "maintain" | "gain"
type ProteinProfile =
  | "balanced"
  | "high_protein"
  | "low_fat"
  | "low_carb"
  | "keto"

const TOTAL_STEPS = 5

const PROTEIN_PROFILES: {
  value: ProteinProfile
  label: string
  description: string
  proteinPerKg: number
  fatPct: number
}[] = [
  {
    value: "balanced",
    label: "Balanced",
    description: "Standard split for general fitness",
    proteinPerKg: 1.8,
    fatPct: 0.25,
  },
  {
    value: "high_protein",
    label: "High Protein",
    description: "2.2g/kg — optimal for muscle building",
    proteinPerKg: 2.2,
    fatPct: 0.25,
  },
  {
    value: "low_fat",
    label: "Low Fat",
    description: "Higher carbs, leaner approach",
    proteinPerKg: 2.0,
    fatPct: 0.2,
  },
  {
    value: "low_carb",
    label: "Low Carb",
    description: "More fat, fewer carbs",
    proteinPerKg: 2.0,
    fatPct: 0.4,
  },
  {
    value: "keto",
    label: "Keto",
    description: "Very low carb, high fat",
    proteinPerKg: 1.6,
    fatPct: 0.7,
  },
]

const CALC_MESSAGES = [
  "Analyzing your profile...",
  "Estimating energy expenditure...",
  "Calibrating macro ratios...",
  "Optimizing for your goal...",
  "Your plan is ready.",
]

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="text-xs text-destructive">
      {message}
    </p>
  )
}

function OptionBtn({
  selected,
  onClick,
  children,
  className,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "border py-3 text-sm font-medium transition-colors",
        selected
          ? "border-foreground bg-foreground text-background"
          : "border-input text-muted-foreground hover:border-foreground hover:text-foreground",
        className
      )}
    >
      {children}
    </button>
  )
}

function ActivityBtn({
  selected,
  onClick,
  label,
  description,
}: {
  selected: boolean
  onClick: () => void
  label: string
  description: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full border px-4 py-3 text-left transition-colors",
        selected
          ? "border-foreground bg-foreground"
          : "border-input hover:border-foreground"
      )}
    >
      <span
        className={cn(
          "block text-sm font-medium",
          selected ? "text-background" : "text-foreground"
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "mt-0.5 block text-xs",
          selected ? "text-background/70" : "text-muted-foreground"
        )}
      >
        {description}
      </span>
    </button>
  )
}

function CalcAnimation() {
  const [msgIdx, setMsgIdx] = useState(0)

  useEffect(() => {
    if (msgIdx >= CALC_MESSAGES.length - 1) return
    const t = setTimeout(() => setMsgIdx((i) => i + 1), 520)
    return () => clearTimeout(t)
  }, [msgIdx])

  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-10">
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-2 rounded-full bg-foreground animate-bounce"
            style={{ animationDelay: `${i * 160}ms` }}
          />
        ))}
      </div>
      <div className="relative h-7 w-full overflow-hidden">
        {CALC_MESSAGES.map((msg, i) => (
          <p
            key={msg}
            className={cn(
              "absolute inset-0 text-center text-sm transition-all duration-500",
              i === msgIdx
                ? "translate-y-0 opacity-100"
                : i < msgIdx
                  ? "-translate-y-5 opacity-0"
                  : "translate-y-5 opacity-0"
            )}
          >
            {msg}
          </p>
        ))}
      </div>
    </div>
  )
}

type MacroSplit = { protein: number; carbs: number; fat: number }

function adjustSplit(
  which: keyof MacroSplit,
  newPct: number,
  cur: MacroSplit
): MacroSplit {
  const clamped = Math.max(10, Math.min(75, newPct))
  const remaining = 100 - clamped
  const otherKeys = (
    ["protein", "carbs", "fat"] as (keyof MacroSplit)[]
  ).filter((k) => k !== which)
  const otherSum = otherKeys.reduce((s, k) => s + cur[k], 0)
  const result = { ...cur, [which]: clamped }
  if (otherSum === 0) {
    const half = Math.round(remaining / 2)
    result[otherKeys[0]] = half
    result[otherKeys[1]] = remaining - half
  } else {
    result[otherKeys[0]] = Math.max(
      5,
      Math.round((cur[otherKeys[0]] / otherSum) * remaining)
    )
    result[otherKeys[1]] = Math.max(5, remaining - result[otherKeys[0]])
  }
  const sum = result.protein + result.carbs + result.fat
  if (sum !== 100) {
    const biggest = otherKeys.reduce((a, b) => (result[a] >= result[b] ? a : b))
    result[biggest] += 100 - sum
  }
  return result
}

function computeAgeFromBirthDate(birthDate: string): number | undefined {
  if (!birthDate) return undefined
  const birth = new Date(birthDate)
  if (isNaN(birth.getTime())) return undefined
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

function calculateMacros(params: {
  weightKg: number
  heightCm?: number
  ageYears?: number
  sex?: Sex | ""
  activityLevel?: ActivityLevel | ""
  goalType: GoalType | ""
  weeklyRateKg?: number
  proteinProfile?: ProteinProfile
}): { calories: number; protein: number; carbs: number; fat: number } {
  const {
    weightKg,
    heightCm = 170,
    ageYears = 28,
    sex,
    activityLevel,
    goalType,
    weeklyRateKg,
    proteinProfile,
  } = params

  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears
  const bmr =
    sex === "male" ? base + 5 : sex === "female" ? base - 161 : base - 78
  const multipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  }
  const tdee =
    bmr * ((activityLevel ? multipliers[activityLevel] : undefined) ?? 1.4)

  let calories: number
  if (goalType === "lose") {
    const dailyDeficit = weeklyRateKg ? (weeklyRateKg * 7700) / 7 : 500
    calories = Math.round(tdee - dailyDeficit)
  } else if (goalType === "gain") {
    calories = Math.round(tdee + 300)
  } else {
    calories = Math.round(tdee)
  }
  calories = Math.max(calories, 1200)

  const profile = proteinProfile
    ? (PROTEIN_PROFILES.find((p) => p.value === proteinProfile) ??
      PROTEIN_PROFILES[0])
    : PROTEIN_PROFILES[0]

  const protein = Math.round(weightKg * profile.proteinPerKg)
  const fat = Math.max(Math.round((calories * profile.fatPct) / 9), 30)
  const carbs = Math.max(Math.round((calories - protein * 4 - fat * 9) / 4), 0)

  return { calories, protein, carbs, fat }
}

function Step1({
  weightUnit,
  energyUnit,
  setWeightUnit,
  setEnergyUnit,
}: {
  weightUnit: WeightUnit
  energyUnit: EnergyUnit
  setWeightUnit: (u: WeightUnit) => void
  setEnergyUnit: (u: EnergyUnit) => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold leading-tight tracking-tight">
          Your units
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Choose how you want to see your numbers.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label>Weight</Label>
        <div className="flex gap-3">
          {(["kg", "lb"] as const).map((u) => (
            <OptionBtn
              key={u}
              selected={weightUnit === u}
              onClick={() => setWeightUnit(u)}
              className="flex-1"
            >
              {u}
            </OptionBtn>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Energy</Label>
        <div className="flex gap-3">
          {(["kcal", "kj"] as const).map((u) => (
            <OptionBtn
              key={u}
              selected={energyUnit === u}
              onClick={() => setEnergyUnit(u)}
              className="flex-1"
            >
              {u === "kcal" ? "kcal" : "kJ"}
            </OptionBtn>
          ))}
        </div>
      </div>
    </div>
  )
}

function Step2({
  weightUnit,
  sex,
  setSex,
  birthDate,
  setBirthDate,
  heightCm,
  setHeightCm,
  heightFt,
  setHeightFt,
  heightIn,
  setHeightIn,
  activityLevel,
  setActivityLevel,
  errors,
}: {
  weightUnit: WeightUnit
  sex: Sex | ""
  setSex: (s: Sex | "") => void
  birthDate: string
  setBirthDate: (v: string) => void
  heightCm: string
  setHeightCm: (v: string) => void
  heightFt: string
  setHeightFt: (v: string) => void
  heightIn: string
  setHeightIn: (v: string) => void
  activityLevel: ActivityLevel | ""
  setActivityLevel: (v: ActivityLevel | "") => void
  errors: Record<string, string>
}) {
  const maxBirthDate = useMemo(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() - 13)
    return d.toISOString().slice(0, 10)
  }, [])

  const minBirthDate = useMemo(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() - 120)
    return d.toISOString().slice(0, 10)
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold leading-tight tracking-tight">
          About you
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Helps us personalise your estimates. All optional.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>Sex</Label>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ["female", "Female"],
              ["male", "Male"],
              ["other", "Other"],
              ["prefer_not_to_say", "Prefer not to say"],
            ] as [Sex, string][]
          ).map(([val, label]) => (
            <OptionBtn
              key={val}
              selected={sex === val}
              onClick={() => setSex(sex === val ? "" : val)}
              className="w-full"
            >
              {label}
            </OptionBtn>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="birth-date">Date of birth</Label>
        <Input
          id="birth-date"
          type="date"
          min={minBirthDate}
          max={maxBirthDate}
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          aria-invalid={!!errors.birthDate}
        />
        <FieldError message={errors.birthDate} />
      </div>

      <div className="space-y-1.5">
        <Label>Height</Label>
        {weightUnit === "kg" ? (
          <div className="relative">
            <Input
              type="number"
              inputMode="decimal"
              placeholder="175"
              min={50}
              max={260}
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              aria-invalid={!!errors.height}
              className="pr-10"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
              cm
            </span>
          </div>
        ) : (
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Input
                type="number"
                inputMode="numeric"
                placeholder="5"
                min={1}
                max={8}
                value={heightFt}
                onChange={(e) => setHeightFt(e.target.value)}
                aria-invalid={!!errors.height}
                className="pr-8"
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                ft
              </span>
            </div>
            <div className="relative flex-1">
              <Input
                type="number"
                inputMode="numeric"
                placeholder="9"
                min={0}
                max={11}
                value={heightIn}
                onChange={(e) => setHeightIn(e.target.value)}
                aria-invalid={!!errors.height}
                className="pr-8"
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                in
              </span>
            </div>
          </div>
        )}
        <FieldError message={errors.height} />
      </div>

      <div className="space-y-1.5">
        <Label>Activity level</Label>
        <div className="space-y-2">
          {(
            [
              ["sedentary", "Sedentary", "Little or no exercise"],
              ["light", "Light", "1–3 training days a week"],
              ["moderate", "Moderate", "3–5 training days a week"],
              ["active", "Active", "6–7 days, lifting + cardio"],
              [
                "very_active",
                "Very active",
                "Twice-daily training, lifting + cardio",
              ],
            ] as [ActivityLevel, string, string][]
          ).map(([val, label, desc]) => (
            <ActivityBtn
              key={val}
              selected={activityLevel === val}
              onClick={() => setActivityLevel(activityLevel === val ? "" : val)}
              label={label}
              description={desc}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function Step3({
  weightUnit,
  currentWeight,
  setCurrentWeight,
  goalType,
  setGoalType,
  targetWeight,
  setTargetWeight,
  goalDate,
  setGoalDate,
  errors,
}: {
  weightUnit: WeightUnit
  currentWeight: string
  setCurrentWeight: (v: string) => void
  goalType: GoalType | ""
  setGoalType: (v: GoalType) => void
  targetWeight: string
  setTargetWeight: (v: string) => void
  goalDate: string
  setGoalDate: (v: string) => void
  errors: Record<string, string>
}) {
  const showGoalDetails = goalType === "lose" || goalType === "gain"

  const minDateStr = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().slice(0, 10)
  }, [])

  const maxDateStr = useMemo(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() + 5)
    return d.toISOString().slice(0, 10)
  }, [])

  const projection = useMemo(() => {
    if (!showGoalDetails || !currentWeight || !targetWeight || !goalDate)
      return null
    const cwKg =
      weightUnit === "lb"
        ? parseFloat(currentWeight) / 2.20462
        : parseFloat(currentWeight)
    const twKg =
      weightUnit === "lb"
        ? parseFloat(targetWeight) / 2.20462
        : parseFloat(targetWeight)
    const gd = new Date(goalDate)
    if (isNaN(cwKg) || isNaN(twKg) || isNaN(gd.getTime())) return null
    if (gd <= new Date()) return null

    const totalWeeks =
      (gd.getTime() - new Date().getTime()) / (7 * 24 * 60 * 60 * 1000)
    const rateKg = Math.abs(cwKg - twKg) / totalWeeks
    const rateDisplay =
      weightUnit === "lb"
        ? Math.round(rateKg * 2.20462 * 100) / 100
        : Math.round(rateKg * 100) / 100

    const currentDisplay =
      weightUnit === "lb"
        ? Math.round(cwKg * 2.20462 * 10) / 10
        : Math.round(cwKg * 10) / 10
    const targetDisplay =
      weightUnit === "lb"
        ? Math.round(twKg * 2.20462 * 10) / 10
        : Math.round(twKg * 10) / 10

    const goalDateLabel = gd.toLocaleDateString("en", {
      month: "short",
      year: "numeric",
    })

    return {
      rateDisplay,
      currentDisplay,
      targetDisplay,
      goalDateLabel,
    }
  }, [currentWeight, targetWeight, goalDate, weightUnit, showGoalDetails])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold leading-tight tracking-tight">
          Weight &amp; goal
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Your current weight and what you&apos;re working towards.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="current-weight">Current weight</Label>
        <div className="relative">
          <Input
            id="current-weight"
            type="number"
            inputMode="decimal"
            placeholder={weightUnit === "kg" ? "75" : "165"}
            value={currentWeight}
            onChange={(e) => setCurrentWeight(e.target.value)}
            aria-invalid={!!errors.currentWeight}
            className="pr-10"
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
            {weightUnit}
          </span>
        </div>
        <FieldError message={errors.currentWeight} />
      </div>

      <div className="space-y-1.5">
        <Label>Goal</Label>
        <div className="flex gap-3">
          {(["lose", "maintain", "gain"] as const).map((g) => (
            <OptionBtn
              key={g}
              selected={goalType === g}
              onClick={() => setGoalType(g)}
              className="flex-1 capitalize"
            >
              {g}
            </OptionBtn>
          ))}
        </div>
        <FieldError message={errors.goalType} />
      </div>

      {showGoalDetails && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-200 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="target-weight">
              Target weight{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <div className="relative">
              <Input
                id="target-weight"
                type="number"
                inputMode="decimal"
                placeholder={weightUnit === "kg" ? "68" : "150"}
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
                aria-invalid={!!errors.targetWeight}
                className="pr-10"
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                {weightUnit}
              </span>
            </div>
            <FieldError message={errors.targetWeight} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="goal-date">
              Goal date{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Input
              id="goal-date"
              type="date"
              min={minDateStr}
              max={maxDateStr}
              value={goalDate}
              onChange={(e) => setGoalDate(e.target.value)}
              aria-invalid={!!errors.goalDate}
            />
            <FieldError message={errors.goalDate} />
          </div>

          {projection && (
            <div className="animate-in fade-in duration-300 flex items-stretch gap-3">
              <div className="flex-1 border border-input px-3 py-2.5">
                <p className="text-base font-semibold tabular-nums">
                  {projection.currentDisplay} {weightUnit}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">today</p>
              </div>
              <div className="flex flex-1 flex-col items-center justify-center gap-1.5">
                <span className="text-xs tabular-nums text-muted-foreground">
                  ~{projection.rateDisplay} {weightUnit}/wk
                </span>
                <div className="flex w-full items-center">
                  <div className="h-px flex-1 border-t border-dashed border-muted-foreground/40" />
                  <ArrowRight className="size-3 shrink-0 text-muted-foreground/50" />
                </div>
              </div>
              <div className="flex-1 border border-foreground bg-foreground px-3 py-2.5">
                <p className="text-base font-semibold tabular-nums text-background">
                  {projection.targetDisplay} {weightUnit}
                </p>
                <p className="mt-0.5 text-xs text-background/60">
                  {projection.goalDateLabel}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Step4({
  proteinProfile,
  setProteinProfile,
}: {
  proteinProfile: ProteinProfile
  setProteinProfile: (v: ProteinProfile) => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold leading-tight tracking-tight">
          Macro composition
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Choose the split that fits your training style. You can fine-tune it
          on the next screen.
        </p>
      </div>
      <div className="space-y-2">
        {PROTEIN_PROFILES.map(({ value, label, description }) => (
          <ActivityBtn
            key={value}
            selected={proteinProfile === value}
            onClick={() => setProteinProfile(value)}
            label={label}
            description={description}
          />
        ))}
      </div>
    </div>
  )
}

const SLIDER_MACROS: {
  key: keyof MacroSplit
  label: string
  kcalPerG: number
}[] = [
  { key: "protein", label: "Protein", kcalPerG: 4 },
  { key: "carbs", label: "Carbs", kcalPerG: 4 },
  { key: "fat", label: "Fat", kcalPerG: 9 },
]

function Step5({
  energyUnit,
  calories,
  setCalories,
  split,
  setSplit,
  errors,
}: {
  energyUnit: EnergyUnit
  calories: string
  setCalories: (v: string) => void
  split: MacroSplit
  setSplit: (s: MacroSplit) => void
  errors: Record<string, string>
}) {
  const energyLabel = energyUnit === "kcal" ? "kcal" : "kJ"
  const kcal = parseFloat(calories) || 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold leading-tight tracking-tight">
          Review your targets
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Calculated from your profile. Adjust calories or drag the sliders to
          fine-tune.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="calories">Calories</Label>
        <div className="relative">
          <Input
            id="calories"
            type="number"
            inputMode="decimal"
            placeholder={energyUnit === "kcal" ? "2000" : "8368"}
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            aria-invalid={!!errors.calories}
            className="pr-12"
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
            {energyLabel}
          </span>
        </div>
        <FieldError message={errors.calories} />
      </div>

      <div className="space-y-5">
        {SLIDER_MACROS.map(({ key, label, kcalPerG }) => {
          const pct = split[key]
          const grams =
            kcal > 0 ? Math.round((kcal * (pct / 100)) / kcalPerG) : 0
          return (
            <div key={key} className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium">{label}</span>
                <span className="tabular-nums text-sm text-muted-foreground">
                  {kcal > 0 ? (
                    <>
                      <span className="font-medium text-foreground">
                        {grams}g
                      </span>{" "}
                      · {pct}%
                    </>
                  ) : (
                    `${pct}%`
                  )}
                </span>
              </div>
              <Slider
                value={[pct]}
                onValueChange={([v]) => setSplit(adjustSplit(key, v, split))}
                min={10}
                max={70}
                step={1}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function CompleteRegistrationForm() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [serverError, setServerError] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg")
  const [energyUnit, setEnergyUnit] = useState<EnergyUnit>("kcal")

  const [sex, setSex] = useState<Sex | "">("")
  const [birthDate, setBirthDate] = useState("")
  const [heightCm, setHeightCm] = useState("")
  const [heightFt, setHeightFt] = useState("")
  const [heightIn, setHeightIn] = useState("")
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | "">("")

  const [currentWeight, setCurrentWeight] = useState("")
  const [goalType, setGoalType] = useState<GoalType | "">("")
  const [targetWeight, setTargetWeight] = useState("")
  const [goalDate, setGoalDate] = useState("")

  const [proteinProfile, setProteinProfile] =
    useState<ProteinProfile>("balanced")

  const [calories, setCalories] = useState("")
  const [split, setSplit] = useState<MacroSplit>({
    protein: 25,
    carbs: 45,
    fat: 30,
  })

  function computeHeightCm(): number | undefined {
    if (weightUnit === "kg") {
      const cm = parseFloat(heightCm)
      return isNaN(cm) ? undefined : cm
    }
    const ft = parseInt(heightFt) || 0
    const inches = parseInt(heightIn) || 0
    if (ft === 0 && inches === 0) return undefined
    return Math.round((ft * 12 + inches) * 2.54 * 10) / 10
  }

  function toWeightKg(value: string): number | undefined {
    const n = parseFloat(value)
    if (isNaN(n)) return undefined
    return weightUnit === "kg" ? n : Math.round((n / 2.20462) * 100) / 100
  }

  function computeWeeklyRateKg(): number | undefined {
    if (!targetWeight || !goalDate || goalType === "maintain") return undefined
    const cwKg = toWeightKg(currentWeight)
    const twKg = toWeightKg(targetWeight)
    if (!cwKg || !twKg) return undefined
    const gd = new Date(goalDate)
    if (isNaN(gd.getTime())) return undefined
    const totalWeeks =
      (gd.getTime() - new Date().getTime()) / (7 * 24 * 60 * 60 * 1000)
    if (totalWeeks <= 0) return undefined
    return Math.abs(cwKg - twKg) / totalWeeks
  }

  function validateStep(s: number): Record<string, string> {
    const errs: Record<string, string> = {}

    if (s === 2) {
      if (birthDate !== "") {
        const age = computeAgeFromBirthDate(birthDate)
        if (age === undefined || age < 13 || age > 120) {
          errs.birthDate = "Must be between 13 and 120 years old"
        }
      }
      const hCm = computeHeightCm()
      const hasHeight =
        weightUnit === "kg"
          ? heightCm !== ""
          : heightFt !== "" || heightIn !== ""
      if (hasHeight && (hCm === undefined || hCm < 50 || hCm > 260)) {
        errs.height =
          weightUnit === "kg"
            ? "Height must be 50–260 cm"
            : "Enter a valid height"
      }
    }

    if (s === 3) {
      if (!currentWeight) {
        errs.currentWeight = "Current weight is required"
      } else {
        const kg = toWeightKg(currentWeight)
        if (kg === undefined || kg < 20 || kg > 500) {
          errs.currentWeight =
            weightUnit === "kg"
              ? "Weight must be 20–500 kg"
              : "Weight must be 44–1100 lb"
        }
      }
      if (!goalType) errs.goalType = "Select a goal"
      if ((goalType === "lose" || goalType === "gain") && targetWeight !== "") {
        const kg = toWeightKg(targetWeight)
        if (kg === undefined || kg < 20 || kg > 500) {
          errs.targetWeight =
            weightUnit === "kg"
              ? "Enter a valid weight (20–500 kg)"
              : "Enter a valid weight (44–1100 lb)"
        }
      }
      if (goalDate !== "") {
        const gd = new Date(goalDate)
        const minGoal = new Date()
        minGoal.setDate(minGoal.getDate() + 6)
        if (isNaN(gd.getTime()) || gd <= minGoal) {
          errs.goalDate = "Goal date must be at least a week from today"
        }
      }
    }

    if (s === 5) {
      if (
        calories !== "" &&
        (isNaN(parseFloat(calories)) || parseFloat(calories) <= 0)
      ) {
        errs.calories = "Must be a positive number"
      }
    }

    return errs
  }

  function advance() {
    const errs = validateStep(step)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})

    if (step === 4) {
      const weightKg = toWeightKg(currentWeight)
      if (weightKg) {
        const weeklyRateKg = computeWeeklyRateKg()
        const calc = calculateMacros({
          weightKg,
          heightCm: computeHeightCm(),
          ageYears: computeAgeFromBirthDate(birthDate),
          sex: sex || undefined,
          activityLevel: activityLevel || undefined,
          goalType,
          weeklyRateKg,
          proteinProfile,
        })
        const energyFactor = energyUnit === "kj" ? 4.184 : 1
        setCalories(Math.round(calc.calories * energyFactor).toString())
        const totalCals = calc.calories
        const proteinPct = Math.round(((calc.protein * 4) / totalCals) * 100)
        const fatPct = Math.round(((calc.fat * 9) / totalCals) * 100)
        setSplit({
          protein: proteinPct,
          fat: fatPct,
          carbs: 100 - proteinPct - fatPct,
        })
      }
      setCalculating(true)
      setTimeout(() => {
        setCalculating(false)
        setStep((s) => s + 1)
      }, 2800)
      return
    }

    setStep((s) => s + 1)
  }

  async function submit() {
    const errs = validateStep(TOTAL_STEPS)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})
    setSubmitting(true)
    setServerError("")

    const weightKg = toWeightKg(currentWeight)
    if (weightKg === undefined) {
      setServerError("Invalid weight value.")
      setSubmitting(false)
      return
    }

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const targetWeightKg =
      targetWeight !== "" ? toWeightKg(targetWeight) : undefined
    const weeklyRateKg = computeWeeklyRateKg()
    const targetDate =
      goalDate !== "" && (goalType === "lose" || goalType === "gain")
        ? goalDate
        : undefined
    const calorieKcal =
      calories !== ""
        ? energyUnit === "kcal"
          ? parseFloat(calories)
          : Math.round(parseFloat(calories) / 4.184)
        : undefined

    const body = {
      profile: {
        timezone,
        sex: sex || undefined,
        birthDate: birthDate !== "" ? birthDate : undefined,
        heightCm: computeHeightCm(),
        activityLevel: activityLevel || undefined,
        weightUnit,
        energyUnit,
      },
      metrics: { weightKg },
      weightGoal: {
        goalType,
        targetWeightKg,
        targetDate,
        weeklyRateKg,
      },
      nutritionPlan: {
        calorieTarget: calorieKcal,
        proteinTarget: calorieKcal
          ? Math.round((calorieKcal * (split.protein / 100)) / 4)
          : undefined,
        carbsTarget: calorieKcal
          ? Math.round((calorieKcal * (split.carbs / 100)) / 4)
          : undefined,
        fatTarget: calorieKcal
          ? Math.round((calorieKcal * (split.fat / 100)) / 9)
          : undefined,
      },
    }

    try {
      const res = await fetch("/api/register/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data: unknown = await res.json().catch(() => ({}))
        const msg =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof (data as Record<string, unknown>).error === "string"
            ? (data as Record<string, string>).error
            : "Something went wrong."
        setServerError(msg)
        setSubmitting(false)
        return
      }
      router.push("/")
    } catch {
      setServerError("Network error. Please try again.")
      setSubmitting(false)
    }
  }

  const isLastStep = step === TOTAL_STEPS

  if (calculating) {
    return (
      <div>
        <div className="mb-8 flex items-center justify-between">
          <span />
          <span className="tabular-nums text-xs text-muted-foreground">
            {step} / {TOTAL_STEPS}
          </span>
        </div>
        <CalcAnimation />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => {
              setErrors({})
              setStep((s) => s - 1)
            }}
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back
          </button>
        ) : (
          <span />
        )}
        <span className="tabular-nums text-xs text-muted-foreground">
          {step} / {TOTAL_STEPS}
        </span>
      </div>

      {step === 1 && (
        <Step1
          weightUnit={weightUnit}
          energyUnit={energyUnit}
          setWeightUnit={setWeightUnit}
          setEnergyUnit={setEnergyUnit}
        />
      )}
      {step === 2 && (
        <Step2
          weightUnit={weightUnit}
          sex={sex}
          setSex={setSex}
          birthDate={birthDate}
          setBirthDate={setBirthDate}
          heightCm={heightCm}
          setHeightCm={setHeightCm}
          heightFt={heightFt}
          setHeightFt={setHeightFt}
          heightIn={heightIn}
          setHeightIn={setHeightIn}
          activityLevel={activityLevel}
          setActivityLevel={setActivityLevel}
          errors={errors}
        />
      )}
      {step === 3 && (
        <Step3
          weightUnit={weightUnit}
          currentWeight={currentWeight}
          setCurrentWeight={setCurrentWeight}
          goalType={goalType}
          setGoalType={setGoalType}
          targetWeight={targetWeight}
          setTargetWeight={setTargetWeight}
          goalDate={goalDate}
          setGoalDate={setGoalDate}
          errors={errors}
        />
      )}
      {step === 4 && (
        <Step4
          proteinProfile={proteinProfile}
          setProteinProfile={setProteinProfile}
        />
      )}
      {step === 5 && (
        <Step5
          energyUnit={energyUnit}
          calories={calories}
          setCalories={setCalories}
          split={split}
          setSplit={setSplit}
          errors={errors}
        />
      )}

      <div className="mt-8">
        <Button
          type="button"
          className="h-12 w-full justify-between rounded-none border-0 bg-primary px-0 pl-4 pr-3 text-base text-primary-foreground hover:bg-primary/85"
          onClick={isLastStep ? submit : advance}
          disabled={submitting}
          size="lg"
        >
          <span>{isLastStep ? "Start tracking" : "Continue"}</span>
          {submitting ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <ArrowRight />
          )}
        </Button>
      </div>

      {serverError && (
        <p
          aria-live="polite"
          className="mt-3 text-center text-sm text-destructive"
        >
          {serverError}
        </p>
      )}
    </div>
  )
}
