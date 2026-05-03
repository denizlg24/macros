"use client"

import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import {
  Apple,
  Barcode,
  CircleEllipsisIcon,
  LayoutTemplate,
  Plus,
  Search,
  Shapes,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { cn } from "@/lib/utils"

const DashboardHeaderLink = ({
  href,
  icon,
  label,
  pathname,
}: {
  href: string
  icon: React.ComponentType
  label: string
  pathname: string
}) => {
  const Icon = icon
  return (
    <Button asChild variant={"link"} className="w-full">
      <Link
        href={href}
        className={cn(
          "flex flex-col items-center gap-1 text-xs",
          pathname === href
            ? "text-muted-foreground!"
            : "text-primary/70 hover:text-primary"
        )}
      >
        <Icon />
        {label}
      </Link>
    </Button>
  )
}

export const DashboardHeader = () => {
  const pathname = usePathname()
  return (
    <header className="w-full p-4 px-0! border-t absolute bottom-0 left-0 z-10">
      <div className="w-full max-w-sm mx-auto grid grid-cols-5 items-center">
        <DashboardHeaderLink
          href="/app"
          icon={LayoutTemplate}
          label="Dashboard"
          pathname={pathname}
        />
        <DashboardHeaderLink
          href="/app/food-log"
          icon={Apple}
          label="Food Log"
          pathname={pathname}
        />
        <Drawer>
          <DrawerTrigger asChild>
            <Button
              variant={"default"}
              className="rounded-full! aspect-square! mx-auto flex"
            >
              <Plus />
            </Button>
          </DrawerTrigger>
          <DrawerContent className="pb-8">
            <VisuallyHidden>
              <DrawerTitle>Add food</DrawerTitle>
            </VisuallyHidden>
            <div className="flex flex-row justify-center gap-8 pt-6">
              <Button
                asChild
                variant={"ghost"}
                className="flex flex-col gap-2 h-auto py-3 px-6"
              >
                <Link href="/app/add">
                  <Search className="size-6" />
                  <span className="text-xs text-muted-foreground">
                    Search Food
                  </span>
                </Link>
              </Button>
              <Button
                asChild
                variant={"ghost"}
                className="flex flex-col gap-2 h-auto py-3 px-6"
              >
                <Link href="/app/scan">
                  <Barcode className="size-6" />
                  <span className="text-xs text-muted-foreground">
                    Scan Barcode
                  </span>
                </Link>
              </Button>
            </div>
          </DrawerContent>
        </Drawer>

        <DashboardHeaderLink
          href="/app/strategy"
          icon={Shapes}
          label="Strategy"
          pathname={pathname}
        />
        <DashboardHeaderLink
          href="/app/more"
          icon={CircleEllipsisIcon}
          label="More"
          pathname={pathname}
        />
      </div>
    </header>
  )
}
