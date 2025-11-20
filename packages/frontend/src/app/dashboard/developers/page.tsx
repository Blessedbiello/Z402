"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Copy, Plus, Trash2 } from "lucide-react"
import { useApi } from "@/hooks/use-api"
import { toast } from "sonner"
import { formatDateTime } from "@/lib/utils"

export default function DevelopersPage() {
  const api = useApi()
  const queryClient = useQueryClient()
  const [newKeyName, setNewKeyName] = useState("")
  const [createdKey, setCreatedKey] = useState<string | null>(null)

  const { data: keys } = useQuery({
    queryKey: ["api-keys"],
    queryFn: () => api.get("/keys"),
  })

  const createKeyMutation = useMutation({
    mutationFn: (name: string) => api.post("/keys", { name, permissions: ["read", "write"] }),
    onSuccess: (data) => {
      setCreatedKey(data.apiKey)
      setNewKeyName("")
      queryClient.invalidateQueries({ queryKey: ["api-keys"] })
      toast.success("API key created successfully")
    },
    onError: () => {
      toast.error("Failed to create API key")
    },
  })

  const deleteKeyMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/keys/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] })
      toast.success("API key deleted")
    },
    onError: () => {
      toast.error("Failed to delete API key")
    },
  })

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Developers</h1>
        <p className="text-muted-foreground">Manage API keys and integrations</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create API Key</CardTitle>
          <CardDescription>Generate a new API key for your application</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input placeholder="Key name (e.g., Production Server)" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
            <Button onClick={() => createKeyMutation.mutate(newKeyName)} disabled={!newKeyName || createKeyMutation.isPending}>
              <Plus className="mr-2 h-4 w-4" />
              Create
            </Button>
          </div>

          {createdKey && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Your new API key (save this, it won't be shown again):</p>
              <div className="flex gap-2">
                <code className="flex-1 p-2 bg-background rounded font-mono text-sm">{createdKey}</code>
                <Button size="icon" variant="outline" onClick={() => copyToClipboard(createdKey)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>{keys?.keys?.length || 0} active keys</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Key Prefix</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys?.keys?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    No API keys yet
                  </TableCell>
                </TableRow>
              ) : (
                keys?.keys?.map((key: any) => (
                  <TableRow key={key.id}>
                    <TableCell>{key.name}</TableCell>
                    <TableCell className="font-mono">{key.keyPrefix}...</TableCell>
                    <TableCell>{formatDateTime(key.createdAt)}</TableCell>
                    <TableCell>{key.lastUsedAt ? formatDateTime(key.lastUsedAt) : "Never"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => deleteKeyMutation.mutate(key.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Documentation</CardTitle>
          <CardDescription>Learn how to integrate Z402 into your application</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Base URL</h3>
              <code className="block p-2 bg-muted rounded text-sm">{process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1"}</code>
            </div>
            <div>
              <h3 className="font-medium mb-2">Authentication</h3>
              <p className="text-sm text-muted-foreground mb-2">Include your API key in the request header:</p>
              <code className="block p-2 bg-muted rounded text-sm">X-API-Key: your_api_key_here</code>
            </div>
            <Button variant="outline" asChild>
              <a href="/api/v1/docs" target="_blank">
                View Full Documentation
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
