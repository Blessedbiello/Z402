import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'ZEC'): string {
  return `${amount.toFixed(4)} ${currency}`
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    VERIFIED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    SETTLED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    FAILED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    EXPIRED: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
    REFUNDED: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text)
}
