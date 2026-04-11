import { request } from './client'

export interface HealthResponse {
  status: string
  version?: string
}

export interface Model {
  id: string
  object: string
  owned_by: string
}

export interface ModelsResponse {
  object: string
  data: Model[]
}

export async function checkHealth(): Promise<HealthResponse> {
  return request<HealthResponse>('/health')
}

export async function fetchModels(): Promise<ModelsResponse> {
  return request<ModelsResponse>('/v1/models')
}
