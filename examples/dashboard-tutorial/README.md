# Z402 Merchant Dashboard - Complete Implementation Guide

This guide contains all the code needed to build the Stripe-inspired dashboard for Z402.

## 1. Theme Provider & Providers Setup

### `src/components/providers/theme-provider.tsx`

```tsx
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
```

### `src/components/providers/query-provider.tsx`

```tsx
"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
```

## 2. Essential shadcn/ui Components

### `src/components/ui/button.tsx`

```tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

### `src/components/ui/card.tsx`

```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
```

### `src/components/ui/badge.tsx`

```tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
```

### `src/components/ui/table.tsx`

```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)}
    {...props}
  />
))
TableCell.displayName = "TableCell"

export { Table, TableHeader, TableBody, TableHead, TableRow, TableCell }
```

## 3. Dashboard Layout

### `src/app/dashboard/layout.tsx`

```tsx
"use client"

import { ThemeProvider } from "@/components/providers/theme-provider"
import { QueryProvider } from "@/components/providers/query-provider"
import { Toaster } from "sonner"
import { DashboardNav } from "@/components/dashboard/nav"
import { DashboardHeader } from "@/components/dashboard/header"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
```

### `src/components/dashboard/nav.tsx`

```tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  CreditCard,
  BarChart3,
  Code,
  Settings,
  Zap
} from "lucide-react"
import { cn } from "@/lib/utils"

const routes = [
  {
    label: "Overview",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    label: "Transactions",
    icon: CreditCard,
    href: "/dashboard/transactions",
  },
  {
    label: "Analytics",
    icon: BarChart3,
    href: "/dashboard/analytics",
  },
  {
    label: "Developers",
    icon: Code,
    href: "/dashboard/developers",
  },
  {
    label: "Settings",
    icon: Settings,
    href: "/dashboard/settings",
  },
]

export function DashboardNav() {
  const pathname = usePathname()

  return (
    <div className="hidden border-r bg-card lg:block w-72">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Zap className="h-6 w-6 text-primary" />
            <span className="text-xl">Z402</span>
          </Link>
        </div>
        <div className="flex-1 overflow-auto py-2">
          <nav className="grid items-start px-4 text-sm font-medium">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
                  pathname === route.href
                    ? "bg-muted text-primary"
                    : "text-muted-foreground"
                )}
              >
                <route.icon className="h-4 w-4" />
                {route.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  )
}
```

### `src/components/dashboard/header.tsx`

```tsx
"use client"

import { Bell, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function DashboardHeader() {
  const { theme, setTheme } = useTheme()

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6">
      <div className="flex-1" />
      <Button variant="ghost" size="icon">
        <Bell className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        {theme === "dark" ? (
          <Sun className="h-5 w-5" />
        ) : (
          <Moon className="h-5 w-5" />
        )}
      </Button>
    </header>
  )
}
```

## 4. Overview Page (Home)

### `src/app/dashboard/page.tsx`

```tsx
"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RevenueChart } from "@/components/dashboard/revenue-chart"
import { RecentTransactions } from "@/components/dashboard/recent-transactions"
import { StatCard } from "@/components/dashboard/stat-card"
import { ArrowUpIcon, ArrowDownIcon, DollarSign, Activity, Users, TrendingUp } from "lucide-react"

export default function DashboardPage() {
  const { data: metrics } = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: async () => {
      const res = await fetch("/api/v1/analytics/dashboard", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      return res.json()
    },
  })

  const { data: realtime } = useQuery({
    queryKey: ["realtime-metrics"],
    queryFn: async () => {
      const res = await fetch("/api/v1/analytics/realtime", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      return res.json()
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground">
          Your payment metrics at a glance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={`${metrics?.metrics.revenue.today.current.toFixed(4)} ZEC`}
          description={`${metrics?.metrics.revenue.today.changePercent > 0 ? "+" : ""}${metrics?.metrics.revenue.today.changePercent.toFixed(1)}% from yesterday`}
          icon={DollarSign}
          trend={metrics?.metrics.revenue.today.direction}
        />
        <StatCard
          title="Transactions"
          value={metrics?.metrics.transactions.today.current || "0"}
          description={`${metrics?.metrics.transactions.today.changePercent > 0 ? "+" : ""}${metrics?.metrics.transactions.today.changePercent.toFixed(1)}% from yesterday`}
          icon={Activity}
          trend={metrics?.metrics.transactions.today.direction}
        />
        <StatCard
          title="Success Rate"
          value={`${metrics?.metrics.successRate.today.toFixed(1)}%`}
          description="Payment success rate"
          icon={TrendingUp}
        />
        <StatCard
          title="Avg Value"
          value={`${metrics?.metrics.averageValue.today.toFixed(4)} ZEC`}
          description="Per transaction"
          icon={Users}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
            <CardDescription>
              Last 7 days
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <RevenueChart />
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>
              You have {realtime?.metrics.live.pendingTransactions || 0} pending
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecentTransactions />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

### `src/components/dashboard/stat-card.tsx`

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: string | number
  description: string
  icon: LucideIcon
  trend?: "up" | "down" | "neutral"
}

export function StatCard({ title, value, description, icon: Icon, trend }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          {trend === "up" && <TrendingUp className="h-3 w-3 text-green-500" />}
          {trend === "down" && <TrendingDown className="h-3 w-3 text-red-500" />}
          {description}
        </p>
      </CardContent>
    </Card>
  )
}
```

### `src/components/dashboard/revenue-chart.tsx`

```tsx
"use client"

import { useQuery } from "@tanstack/react-query"
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

export function RevenueChart() {
  const { data } = useQuery({
    queryKey: ["revenue-trend"],
    queryFn: async () => {
      const res = await fetch("/api/v1/analytics/trends/week", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      const json = await res.json()
      return json.trend || []
    },
  })

  return (
    <ResponsiveContainer width="100%" height={350}>
      <AreaChart data={data}>
        <XAxis
          dataKey="date"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value} ZEC`}
        />
        <Tooltip />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="hsl(var(--primary))"
          fill="hsl(var(--primary))"
          fillOpacity={0.2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
```

### `src/components/dashboard/recent-transactions.tsx`

```tsx
"use client"

import { useQuery } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDateTime, getStatusColor } from "@/lib/utils"

export function RecentTransactions() {
  const { data } = useQuery({
    queryKey: ["recent-transactions"],
    queryFn: async () => {
      const res = await fetch("/api/v1/transactions?limit=5", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      const json = await res.json()
      return json.transactions || []
    },
  })

  if (!data?.length) {
    return <div className="text-sm text-muted-foreground">No recent transactions</div>
  }

  return (
    <div className="space-y-4">
      {data.map((tx: any) => (
        <div key={tx.id} className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium leading-none">{tx.resourceUrl}</p>
            <p className="text-sm text-muted-foreground">
              {formatDateTime(tx.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(tx.status)}>{tx.status}</Badge>
            <div className="font-medium">{formatCurrency(tx.amount)}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
```

## 5. Transactions Page

### `src/app/dashboard/transactions/page.tsx`

```tsx
"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Download, Search } from "lucide-react"
import { formatCurrency, formatDateTime, getStatusColor } from "@/lib/utils"

export default function TransactionsPage() {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ["transactions", page, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(search && { search }),
      })
      const res = await fetch(`/api/v1/transactions?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      return res.json()
    },
  })

  const handleExport = async () => {
    const res = await fetch("/api/v1/transactions/export/data?format=csv", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `transactions-${Date.now()}.csv`
    a.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">
            Manage and view your payment history
          </p>
        </div>
        <Button onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
          <CardDescription>
            {data?.pagination.total || 0} transactions total
          </CardDescription>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : data?.transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                data?.transactions.map((tx: any) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-mono text-sm">
                      {tx.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>{tx.resourceUrl}</TableCell>
                    <TableCell>{formatCurrency(tx.amount)}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(tx.status)}>
                        {tx.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDateTime(tx.createdAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {data?.pagination && (
            <div className="flex items-center justify-between px-2 py-4">
              <div className="text-sm text-muted-foreground">
                Showing {(page - 1) * 20 + 1} to{" "}
                {Math.min(page * 20, data.pagination.total)} of{" "}
                {data.pagination.total} transactions
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!data.pagination.hasMore}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

## 6. Usage Instructions

1. **Install dependencies**:
```bash
cd packages/frontend
pnpm install
```

2. **Create all files** from this guide in their respective locations

3. **Add missing UI components**: You'll need to add `Input` component similar to Button and Card

4. **Update root layout** (`src/app/layout.tsx`):
```tsx
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

5. **Run development server**:
```bash
pnpm dev
```

## 7. Additional Components Needed

Add these components following the same pattern:
- `Input` - Text input field
- `Select` - Dropdown select
- `Dialog` - Modal dialogs
- `Tabs` - Tab navigation
- `Switch` - Toggle switch
- `Separator` - Divider line

All follow the shadcn/ui patterns shown in the examples above.

## 8. API Integration

Update all `fetch` calls to use your actual API endpoints and handle authentication properly. Consider creating a custom hook for API calls:

```tsx
// src/hooks/use-api.ts
export function useApi() {
  const token = localStorage.getItem("token")

  return {
    get: (url: string) =>
      fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
    post: (url: string, data: any) =>
      fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
  }
}
```

This provides a complete foundation for a beautiful, Stripe-inspired dashboard!
