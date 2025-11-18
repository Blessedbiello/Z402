"use client"

import { useQuery } from "@tanstack/react-query"
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useApi } from "@/hooks/use-api"

export function RevenueChart() {
  const api = useApi()

  const { data } = useQuery({
    queryKey: ["revenue-trend"],
    queryFn: async () => {
      const json = await api.get("/analytics/trends/week")
      return json.trend || []
    },
  })

  return (
    <ResponsiveContainer width="100%" height={350}>
      <AreaChart data={data}>
        <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
        <Tooltip />
        <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
