"use client"

import { ThemeProvider } from "@/components/providers/theme-provider"
import { QueryProvider } from "@/components/providers/query-provider"
import { Toaster } from "sonner"
import { DashboardNav } from "@/components/dashboard/nav"
import { DashboardHeader } from "@/components/dashboard/header"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryProvider>
        <div className="flex min-h-screen">
          <DashboardNav />
          <div className="flex-1">
            <DashboardHeader />
            <main className="p-6 lg:p-8">{children}</main>
          </div>
        </div>
        <Toaster richColors />
      </QueryProvider>
    </ThemeProvider>
  )
}
