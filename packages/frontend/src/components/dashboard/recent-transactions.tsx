"use client"

import { useQuery } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDateTime, getStatusColor } from "@/lib/utils"
import { useApi } from "@/hooks/use-api"

export function RecentTransactions() {
  const api = useApi()

  const { data } = useQuery({
    queryKey: ["recent-transactions"],
    queryFn: async () => {
      const json = await api.get("/transactions?limit=5")
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
            <p className="text-sm font-medium leading-none truncate max-w-[200px]">{tx.resourceUrl}</p>
            <p className="text-sm text-muted-foreground">{formatDateTime(tx.createdAt)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(tx.status)}>{tx.status}</Badge>
            <div className="font-medium">{formatCurrency(Number(tx.amount))}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
