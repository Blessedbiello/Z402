"use client"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1"

export function useApi() {
  const getToken = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("z402_token")
    }
    return null
  }

  const apiCall = async (endpoint: string, options?: RequestInit) => {
    const token = getToken()
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }

    return response.json()
  }

  return {
    get: (url: string) => apiCall(url),
    post: (url: string, data: any) =>
      apiCall(url, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    put: (url: string, data: any) =>
      apiCall(url, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (url: string) =>
      apiCall(url, {
        method: "DELETE",
      }),
  }
}
