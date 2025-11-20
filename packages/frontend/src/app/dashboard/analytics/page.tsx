"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useApi } from "@/hooks/use-api"

export default function AnalyticsPage() {
  const api = useApi()

  const { data: peakTimes } = useQuery({
    queryKey: ["peak-times"],
    queryFn: () => api.get("/analytics/peak-times?days=30"),
  })

  const { data: topResources } = useQuery({
    queryKey: ["top-resources"],
    queryFn: () => api.get("/analytics/top-resources?limit=10"),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Insights and metrics</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Peak Transaction Times</CardTitle>
            <CardDescription>Transaction volume by hour (last 30 days)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={peakTimes?.peakTimes || []}>
                <XAxis dataKey="label" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="transactionCount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Resources</CardTitle>
            <CardDescription>By revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topResources?.resources?.slice(0, 5).map((resource: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium truncate max-w-[250px]">{resource.url}</p>
                    <p className="text-xs text-muted-foreground">{resource.transactionCount} transactions</p>
                  </div>
                  <div className="text-sm font-medium">{Number(resource.revenue).toFixed(4)} ZEC</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
