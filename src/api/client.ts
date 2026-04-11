const DEFAULT_BASE_URL = ''

function getBaseUrl(): string {
  return localStorage.getItem('hermes_server_url') || DEFAULT_BASE_URL
}

function getApiKey(): string {
  return localStorage.getItem('hermes_api_key') || ''
}

export function setServerUrl(url: string) {
  localStorage.setItem('hermes_server_url', url)
}

export function setApiKey(key: string) {
  localStorage.setItem('hermes_api_key', key)
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const base = getBaseUrl()
  const url = `${base}${path}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  }

  const apiKey = getApiKey()
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`
  }

  const res = await fetch(url, { ...options, headers })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API Error ${res.status}: ${text || res.statusText}`)
  }

  return res.json()
}

export function getBaseUrlValue(): string {
  return getBaseUrl()
}
