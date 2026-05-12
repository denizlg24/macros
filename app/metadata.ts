import type { Metadata } from "next"

const appName = "Macros"
const defaultDescription =
  "A mobile-first nutrition tracker for food logs, recipes, micronutrients, weight trends, and energy expenditure."

export function pageMetadata(
  title: string,
  description = defaultDescription
): Metadata {
  return {
    title,
    description,
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: appName,
    },
    applicationName: appName,
    formatDetection: {
      telephone: false,
    },
    openGraph: {
      title,
      description,
      siteName: appName,
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  }
}

export const rootMetadata: Metadata = {
  ...pageMetadata(appName),
  title: {
    default: appName,
    template: `%s | ${appName}`,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
}
