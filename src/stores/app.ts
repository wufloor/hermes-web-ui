import { defineStore } from 'pinia'
import { ref } from 'vue'
import { checkHealth, fetchModels } from '@/api/system'
import type { Model } from '@/api/system'

export const useAppStore = defineStore('app', () => {
  const connected = ref(false)
  const serverVersion = ref('')
  const models = ref<Model[]>([])
  const healthPollTimer = ref<ReturnType<typeof setInterval>>()

  // Settings
  const streamEnabled = ref(true)
  const sessionPersistence = ref(true)
  const maxTokens = ref(4096)
  const selectedModel = ref('hermes-agent')

  async function checkConnection() {
    try {
      const res = await checkHealth()
      connected.value = true
      if (res.version) serverVersion.value = res.version
    } catch {
      connected.value = false
    }
  }

  async function loadModels() {
    try {
      const res = await fetchModels()
      models.value = res.data || []
      if (models.value.length > 0 && !models.value.find(m => m.id === selectedModel.value)) {
        selectedModel.value = models.value[0].id
      }
    } catch {
      // ignore
    }
  }

  function startHealthPolling(interval = 30000) {
    stopHealthPolling()
    checkConnection()
    healthPollTimer.value = setInterval(checkConnection, interval)
  }

  function stopHealthPolling() {
    if (healthPollTimer.value) {
      clearInterval(healthPollTimer.value)
      healthPollTimer.value = undefined
    }
  }

  return {
    connected,
    serverVersion,
    models,
    streamEnabled,
    sessionPersistence,
    maxTokens,
    selectedModel,
    checkConnection,
    loadModels,
    startHealthPolling,
    stopHealthPolling,
  }
})
