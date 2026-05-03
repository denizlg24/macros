"use client"

import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import {
  Activity,
  Apple,
  Barcode,
  ChefHat,
  ChevronRight,
  CircleEllipsisIcon,
  LayoutTemplate,
  Plus,
  Scale,
  Search,
  Shapes,
  SlidersHorizontal,
  Utensils,
  X,
  Zap,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { cn } from "@/lib/utils"

type NavLinkProps = {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  active: boolean
}

function NavLink({ href, icon: Icon, label, active }: NavLinkProps) {
  return (
    <Button
      asChild
      variant="ghost"
      className="w-full flex-col gap-1 h-auto py-2 px-1"
    >
      <Link
        href={href}
        className={cn(
          "flex flex-col items-center gap-1",
          active ? "text-foreground" : "text-muted-foreground"
        )}
      >
        <Icon className="size-5" />
        <span className="text-[10px]">{label}</span>
      </Link>
    </Button>
  )
}

type ShortcutCircleProps = {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  onNavigate: () => void
}

function ShortcutCircle({
  href,
  icon: Icon,
  label,
  onNavigate,
}: ShortcutCircleProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex flex-col items-center gap-2"
    >
      <div className="size-16 rounded-full bg-muted flex items-center justify-center">
        <Icon className="size-6" />
      </div>
      <span className="text-sm text-muted-foreground">{label}</span>
    </Link>
  )
}

type ShortcutRowProps = {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  onNavigate: () => void
}

function ShortcutRow({
  href,
  icon: Icon,
  label,
  onNavigate,
}: ShortcutRowProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex items-center gap-4 py-4 px-6 border-b border-border/40"
    >
      <Icon className="size-5 text-muted-foreground shrink-0" />
      <span className="flex-1 text-base">{label}</span>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  )
}

export function DashboardHeader() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  function close() {
    setOpen(false)
  }

  return (
    <header className="fixed bottom-0 left-0 right-0 z-10 bg-background border-t">
      <div className="px-4 py-2 max-w-sm mx-auto">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Link
              href="/app/add"
              className="absolute inset-0 rounded-full"
              aria-label="Search for a food"
            />
            <div className="pointer-events-none flex items-center gap-3 h-11 px-4 rounded-full bg-muted text-muted-foreground text-sm">
              <Search className="size-4 shrink-0" />
              <span className="flex-1">Search for a food</span>
              <span className="size-8" />
            </div>
            <Link
              href="/app/scan"
              aria-label="Scan barcode"
              className="pointer-events-auto absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center size-8 rounded-full hover:bg-muted-foreground/10 transition-colors z-10"
            >
              <Barcode className="size-4 text-muted-foreground" />
            </Link>
          </div>

          {/* <Link
            href="/app/ai"
            aria-label="AI assistant"
            className="size-11 rounded-full bg-muted flex items-center justify-center shrink-0 hover:bg-muted/80 transition-colors"
          >
            <Sparkles className="size-5 text-muted-foreground" />
          </Link> */}
        </div>
      </div>

      <div className="w-full max-w-sm mx-auto grid grid-cols-5 items-center px-2 pb-4">
        <NavLink
          href="/app"
          icon={LayoutTemplate}
          label="Dashboard"
          active={pathname === "/app"}
        />
        <NavLink
          href="/app/food-log"
          icon={Apple}
          label="Food Log"
          active={pathname === "/app/food-log"}
        />

        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <Button
              variant="default"
              className="rounded-full! aspect-square! mx-auto size-12 flex items-center justify-center"
            >
              <Plus className="size-5" />
            </Button>
          </DrawerTrigger>
          <DrawerContent className="pb-8">
            <VisuallyHidden>
              <DrawerTitle>Shortcuts</DrawerTitle>
              <DrawerDescription>
                Quick access to frequently used features and tools.
              </DrawerDescription>
            </VisuallyHidden>

            <div className="flex items-center px-6 py-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={close}
                className="-ml-2"
                aria-label="Close"
              >
                <X className="size-5" />
              </Button>
              <span className="flex-1 text-center font-semibold text-base">
                Shortcuts
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="-mr-2"
                aria-label="Customize shortcuts"
              >
                <SlidersHorizontal className="size-5" />
              </Button>
            </div>

            <div className="h-px bg-border" />

            <div className="flex justify-around px-6 py-6">
              {/* <ShortcutCircle
                href="/app/ai"
                icon={Sparkles}
                label="AI"
                onNavigate={close}
              /> */}
              <ShortcutCircle
                href="/app/weight"
                icon={Scale}
                label="Weight"
                onNavigate={close}
              />
              <ShortcutCircle
                href="/app/add"
                icon={Search}
                label="Search"
                onNavigate={close}
              />
              <ShortcutCircle
                href="/app/scan"
                icon={Barcode}
                label="Barcode"
                onNavigate={close}
              />
            </div>

            <div>
              <ShortcutRow
                href="/app/foods"
                icon={Utensils}
                label="Your Foods"
                onNavigate={close}
              />
              <ShortcutRow
                href="/app/quick-add"
                icon={Zap}
                label="Quick Add"
                onNavigate={close}
              />
              <ShortcutRow
                href="/app/metrics"
                icon={Activity}
                label="Metrics"
                onNavigate={close}
              />
              <ShortcutRow
                href="/app/recipes"
                icon={ChefHat}
                label="Recipes"
                onNavigate={close}
              />
            </div>
          </DrawerContent>
        </Drawer>

        <NavLink
          href="/app/strategy"
          icon={Shapes}
          label="Strategy"
          active={pathname === "/app/strategy"}
        />
        <NavLink
          href="/app/more"
          icon={CircleEllipsisIcon}
          label="More"
          active={pathname === "/app/more"}
        />
      </div>
    </header>
  )
}
