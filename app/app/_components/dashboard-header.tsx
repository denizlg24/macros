"use client"

import {
  Apple,
  Barcode,
  CircleEllipsisIcon,
  LayoutTemplate,
  Search,
  Shapes,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
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

export function DashboardHeader() {
  const pathname = usePathname()

  return (
    <header className="fixed bottom-0 left-0 right-0 z-10 bg-background border-t">
      <div className="px-4 py-2 max-w-sm mx-auto">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Link
              href="/app/add?focus=search"
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

      <div className="w-full max-w-sm mx-auto grid grid-cols-4 items-center px-2 pb-4">
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
