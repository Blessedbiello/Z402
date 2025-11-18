"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useApi } from "@/hooks/use-api"
import { toast } from "sonner"
import { useState } from "react"
import { Copy } from "lucide-react"

export default function SettingsPage() {
  const api = useApi()
  const queryClient = useQueryClient()
  const [webhookUrl, setWebhookUrl] = useState("")

  const { data: merchant } = useQuery({
    queryKey: ["merchant"],
    queryFn: () => api.get("/auth/me"),
  })

  const { data: webhookConfig } = useQuery({
    queryKey: ["webhook-config"],
    queryFn: () => api.get("/webhook-management"),
    onSuccess: (data) => {
      if (data?.webhook?.url) {
        setWebhookUrl(data.webhook.url)
      }
    },
  })

  const updateWebhookMutation = useMutation({
    mutationFn: (url: string) => api.put("/webhook-management", { webhookUrl: url }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-config"] })
      toast.success("Webhook URL updated")
    },
    onError: () => {
      toast.error("Failed to update webhook URL")
    },
  })

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
          <CardDescription>Your merchant information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <p className="text-sm text-muted-foreground">{merchant?.merchant?.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium">Merchant ID</label>
            <div className="flex gap-2 items-center">
              <code className="text-sm bg-muted px-2 py-1 rounded">{merchant?.merchant?.id}</code>
              <Button size="icon" variant="ghost" onClick={() => copyToClipboard(merchant?.merchant?.id)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Zcash Addresses</CardTitle>
          <CardDescription>Your payment receiving addresses</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Transparent Address</label>
            <div className="flex gap-2 items-center">
              <code className="text-sm bg-muted px-2 py-1 rounded flex-1 truncate">{merchant?.merchant?.zcashAddress}</code>
              <Button size="icon" variant="ghost" onClick={() => copyToClipboard(merchant?.merchant?.zcashAddress)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {merchant?.merchant?.zcashShieldedAddress && (
            <div>
              <label className="text-sm font-medium">Shielded Address</label>
              <div className="flex gap-2 items-center">
                <code className="text-sm bg-muted px-2 py-1 rounded flex-1 truncate">{merchant?.merchant?.zcashShieldedAddress}</code>
                <Button size="icon" variant="ghost" onClick={() => copyToClipboard(merchant?.merchant?.zcashShieldedAddress)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Webhook Configuration</CardTitle>
          <CardDescription>Receive real-time payment notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Webhook URL</label>
            <div className="flex gap-2 mt-2">
              <Input placeholder="https://your-domain.com/webhooks" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} />
              <Button onClick={() => updateWebhookMutation.mutate(webhookUrl)} disabled={updateWebhookMutation.isPending}>
                Save
              </Button>
            </div>
          </div>
          {webhookConfig?.webhook?.secret && (
            <div>
              <label className="text-sm font-medium">Webhook Secret</label>
              <div className="flex gap-2 items-center mt-2">
                <code className="text-sm bg-muted px-2 py-1 rounded flex-1 truncate">{webhookConfig.webhook.secret}</code>
                <Button size="icon" variant="ghost" onClick={() => copyToClipboard(webhookConfig.webhook.secret)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Use this to verify webhook signatures</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
