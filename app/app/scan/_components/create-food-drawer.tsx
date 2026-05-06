"use client"

import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { ArrowLeft, LoaderCircle, Plus, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createFoodResponseSchema } from "@/lib/foods/contracts"
import type { NutrientKey } from "@/lib/foods/nutrients"
import { nutrientDefinitionsInput } from "@/lib/foods/nutrients"
import { NUTRIENT_SECTIONS } from "@/lib/foods/who-guidelines"
import type { FoodSummary } from "../../add/_components/food-detail-drawer"
import { putUserCreatedFood } from "../../add/_lib/food-search-cache"

interface ServingSizeDraft {
  uid: string
  label: string
  quantity: string
  unit: string
}

interface CreateFoodDrawerProps {
  open: boolean
  barcode: string | null
  onClose: () => void
  onCreated: (food: FoodSummary) => void
}

const defaultNutrients: Partial<Record<NutrientKey, string>> = {
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
}

function newServingSize(): ServingSizeDraft {
  return {
    uid: crypto.randomUUID(),
    label: "serving",
    quantity: "100",
    unit: "g",
  }
}

function parsePositive(value: string) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function parseNonNegative(value: string) {
  if (value.trim() === "") return null
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

export function CreateFoodDrawer({
  open,
  barcode,
  onClose,
  onCreated,
}: CreateFoodDrawerProps) {
  const [name, setName] = useState("")
  const [brand, setBrand] = useState("")
  const [servingSizes, setServingSizes] = useState<ServingSizeDraft[]>(() => [
    newServingSize(),
  ])
  const [nutrients, setNutrients] =
    useState<Partial<Record<NutrientKey, string>>>(defaultNutrients)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const nutrientSections = useMemo(
    () =>
      NUTRIENT_SECTIONS.map((section) => ({
        title: section.title,
        nutrients: section.keys
          .map((key) =>
            nutrientDefinitionsInput.find((item) => item.key === key)
          )
          .filter((item) => item !== undefined),
      })),
    []
  )

  const updateServingSize = (
    uid: string,
    field: keyof Omit<ServingSizeDraft, "uid">,
    value: string
  ) => {
    setServingSizes((current) =>
      current.map((serving) =>
        serving.uid === uid ? { ...serving, [field]: value } : serving
      )
    )
  }

  const removeServingSize = (uid: string) => {
    setServingSizes((current) =>
      current.length === 1
        ? current
        : current.filter((serving) => serving.uid !== uid)
    )
  }

  const submit = async () => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      toast.error("Food name is required")
      return
    }

    const parsedServingSizes = servingSizes.map((serving) => ({
      label: serving.label.trim(),
      quantity: parsePositive(serving.quantity),
      unit: serving.unit.trim(),
    }))

    if (
      parsedServingSizes.some(
        (serving) => !serving.label || !serving.quantity || !serving.unit
      )
    ) {
      toast.error("Each serving size needs a label, quantity, and unit")
      return
    }

    const parsedNutrients: Partial<Record<NutrientKey, number>> = {}
    for (const definition of nutrientDefinitionsInput) {
      const parsed = parseNonNegative(nutrients[definition.key] ?? "")
      if (parsed != null) {
        parsedNutrients[definition.key] = parsed
      }
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/foods", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientMutationId: crypto.randomUUID(),
          barcode: barcode ?? undefined,
          name: trimmedName,
          brand,
          servingSizes: parsedServingSizes,
          nutrients: parsedNutrients,
        }),
      })

      if (!response.ok) {
        throw new Error(`Food creation failed with ${response.status}`)
      }

      const body = createFoodResponseSchema.parse(await response.json())
      await putUserCreatedFood(body.item, body.fetchedAt)
      onCreated(body.item)
      setName("")
      setBrand("")
      setServingSizes([newServingSize()])
      setNutrients(defaultNutrients)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not create this food"
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Drawer
      hideBackdrop
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && onClose()}
      repositionInputs={false}
    >
      <DrawerContent className="z-70! flex h-[calc(100dvh-4rem)]! max-h-none! flex-col rounded-none">
        <VisuallyHidden>
          <DrawerTitle>Create food</DrawerTitle>
          <DrawerDescription>Add a food for this barcode.</DrawerDescription>
        </VisuallyHidden>

        <div className="flex flex-none items-center gap-2 border-b border-border px-3 py-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close create food"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
          </button>
          <h2 className="truncate text-sm font-semibold text-foreground">
            Add Food
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="create-food-name">Food name</Label>
              <Input
                id="create-food-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="create-food-brand">Brand</Label>
                <Input
                  id="create-food-brand"
                  value={brand}
                  onChange={(event) => setBrand(event.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-food-barcode">Barcode</Label>
                <Input
                  id="create-food-barcode"
                  value={barcode ?? ""}
                  readOnly
                />
              </div>
            </div>
          </div>

          <section className="pt-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Serving Sizes</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setServingSizes((current) => [...current, newServingSize()])
                }
              >
                <Plus className="size-4" />
                Add
              </Button>
            </div>
            <div className="space-y-2">
              {servingSizes.map((serving, index) => (
                <div
                  key={serving.uid}
                  className="grid grid-cols-[1fr_5rem_4rem_auto] gap-2"
                >
                  <Input
                    aria-label={`Serving ${index + 1} label`}
                    value={serving.label}
                    onChange={(event) =>
                      updateServingSize(
                        serving.uid,
                        "label",
                        event.target.value
                      )
                    }
                  />
                  <Input
                    aria-label={`Serving ${index + 1} quantity`}
                    value={serving.quantity}
                    onChange={(event) =>
                      updateServingSize(
                        serving.uid,
                        "quantity",
                        event.target.value
                      )
                    }
                    inputMode="decimal"
                  />
                  <Input
                    aria-label={`Serving ${index + 1} unit`}
                    value={serving.unit}
                    onChange={(event) =>
                      updateServingSize(serving.uid, "unit", event.target.value)
                    }
                  />
                  <button
                    type="button"
                    onClick={() => removeServingSize(serving.uid)}
                    aria-label={`Remove serving ${index + 1}`}
                    disabled={servingSizes.length === 1}
                    className="flex size-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {nutrientSections.map((section) => (
            <section key={section.title} className="pt-5">
              <h3 className="mb-2 text-sm font-semibold">{section.title}</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {section.nutrients.map((nutrient) => (
                  <label
                    key={nutrient.key}
                    className="grid grid-cols-[1fr_6rem_2.5rem] items-center gap-2 text-xs"
                  >
                    <span className="min-w-0 truncate text-muted-foreground">
                      {nutrient.label}
                    </span>
                    <Input
                      value={nutrients[nutrient.key] ?? ""}
                      onChange={(event) =>
                        setNutrients((current) => ({
                          ...current,
                          [nutrient.key]: event.target.value,
                        }))
                      }
                      inputMode="decimal"
                      className="h-9 text-right tabular-nums"
                    />
                    <span className="text-muted-foreground">
                      {nutrient.unit}
                    </span>
                  </label>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div
          className="flex-none border-t border-border bg-background px-3 py-3"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)" }}
        >
          <Button
            type="button"
            onClick={submit}
            disabled={isSubmitting}
            className="h-11 w-full rounded-full bg-foreground text-background hover:bg-foreground/90"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                Creating
              </>
            ) : (
              "Create Food"
            )}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
