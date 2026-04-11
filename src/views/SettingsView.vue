<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  NButton, NInput, NSwitch, NSlider, NSelect, NDataTable, useMessage,
} from 'naive-ui'
import { useAppStore } from '@/stores/app'
import { setServerUrl, setApiKey, getBaseUrlValue } from '@/api/client'

const appStore = useAppStore()
const message = useMessage()

const serverUrl = ref(getBaseUrlValue())
const apiKey = ref(localStorage.getItem('hermes_api_key') || '')
const testingConnection = ref(false)

const modelOptions = computed(() =>
  appStore.models.map(m => ({ label: m.id, value: m.id })),
)

async function handleTestConnection() {
  testingConnection.value = true
  setServerUrl(serverUrl.value)
  if (apiKey.value) setApiKey(apiKey.value)
  try {
    await appStore.checkConnection()
    if (appStore.connected) {
      message.success('Connected successfully')
    } else {
      message.error('Connection failed')
    }
  } catch (e: any) {
    message.error(e.message)
  } finally {
    testingConnection.value = false
  }
}

function handleSaveApiKey() {
  setApiKey(apiKey.value)
  message.success('API key saved')
}

const endpointColumns = [
  { title: 'Method', key: 'method', width: 80 },
  { title: 'Endpoint', key: 'endpoint' },
  { title: 'Description', key: 'description' },
]

const endpoints = [
  { method: 'GET', endpoint: '/health', description: 'Health Check' },
  { method: 'GET', endpoint: '/v1/health', description: 'Health Check (v1)' },
  { method: 'GET', endpoint: '/v1/models', description: 'Model List' },
  { method: 'POST', endpoint: '/v1/chat/completions', description: 'Chat Completions (OpenAI compatible)' },
  { method: 'POST', endpoint: '/v1/responses', description: 'Create Response (stateful)' },
  { method: 'GET', endpoint: '/v1/responses/{id}', description: 'Get Stored Response' },
  { method: 'DELETE', endpoint: '/v1/responses/{id}', description: 'Delete Response' },
  { method: 'POST', endpoint: '/v1/runs', description: 'Start Async Run' },
  { method: 'GET', endpoint: '/v1/runs/{id}/events', description: 'SSE Event Stream' },
  { method: 'GET', endpoint: '/api/jobs', description: 'List Jobs' },
  { method: 'POST', endpoint: '/api/jobs', description: 'Create Job' },
  { method: 'GET', endpoint: '/api/jobs/{id}', description: 'Get Job Detail' },
  { method: 'PATCH', endpoint: '/api/jobs/{id}', description: 'Update Job' },
  { method: 'DELETE', endpoint: '/api/jobs/{id}', description: 'Delete Job' },
  { method: 'POST', endpoint: '/api/jobs/{id}/pause', description: 'Pause Job' },
  { method: 'POST', endpoint: '/api/jobs/{id}/resume', description: 'Resume Job' },
  { method: 'POST', endpoint: '/api/jobs/{id}/run', description: 'Trigger Job Now' },
]
</script>

<template>
  <div class="settings-view">
    <header class="settings-header">
      <h2 class="header-title">Settings</h2>
    </header>

    <div class="settings-content">
      <!-- API Configuration -->
      <section class="settings-section">
        <h3 class="section-title">API Configuration</h3>
        <div class="form-group">
          <label class="form-label">Server URL</label>
          <NInput v-model:value="serverUrl" placeholder="http://127.0.0.1:8642" />
        </div>
        <div class="form-group">
          <label class="form-label">API Key (optional)</label>
          <div class="input-with-action">
            <NInput v-model:value="apiKey" type="password" show-password-on="click" placeholder="Enter API key" />
            <NButton size="small" @click="handleSaveApiKey">Save</NButton>
          </div>
        </div>
        <div class="form-group">
          <div class="connection-status">
            <span class="status-dot" :class="{ on: appStore.connected, off: !appStore.connected }"></span>
            <span>{{ appStore.connected ? 'Connected' : 'Disconnected' }}</span>
            <span v-if="appStore.serverVersion" class="version">v{{ appStore.serverVersion }}</span>
          </div>
          <NButton type="primary" size="small" :loading="testingConnection" @click="handleTestConnection">
            Test Connection
          </NButton>
        </div>
      </section>

      <!-- Chat Settings -->
      <section class="settings-section">
        <h3 class="section-title">Chat Settings</h3>
        <div class="form-group">
          <label class="form-label">Default Model</label>
          <NSelect
            v-model:value="appStore.selectedModel"
            :options="modelOptions"
            placeholder="Select model"
          />
        </div>
        <div class="form-group">
          <label class="form-label">Stream Responses</label>
          <NSwitch v-model:value="appStore.streamEnabled" />
        </div>
        <div class="form-group">
          <label class="form-label">Session Persistence</label>
          <NSwitch v-model:value="appStore.sessionPersistence" />
        </div>
        <div class="form-group">
          <label class="form-label">Max Tokens: {{ appStore.maxTokens }}</label>
          <NSlider v-model:value="appStore.maxTokens" :min="256" :max="32768" :step="256" />
        </div>
      </section>

      <!-- About -->
      <section class="settings-section">
        <h3 class="section-title">About</h3>
        <p class="about-text">
          Hermes Agent Web UI
          <br />Version 0.1.0
        </p>
        <div class="endpoint-table">
          <NDataTable
            :columns="endpointColumns"
            :data="endpoints"
            :bordered="false"
            size="small"
            :row-props="() => ({ style: 'cursor: default;' })"
          />
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.settings-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.settings-header {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid $border-color;
  flex-shrink: 0;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: $text-primary;
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  max-width: 640px;
}

.settings-section {
  margin-bottom: 28px;

  .section-title {
    font-size: 13px;
    font-weight: 600;
    color: $text-secondary;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 14px;
    padding-bottom: 8px;
    border-bottom: 1px solid $border-light;
  }
}

.form-group {
  margin-bottom: 14px;

  .form-label {
    display: block;
    font-size: 13px;
    color: $text-secondary;
    margin-bottom: 6px;
  }
}

.input-with-action {
  display: flex;
  gap: 8px;
  align-items: center;

  .n-input {
    flex: 1;
  }
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: $text-secondary;
  margin-bottom: 10px;

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;

    &.on {
      background-color: $success;
      box-shadow: 0 0 6px rgba($success, 0.5);
    }

    &.off {
      background-color: $error;
    }
  }

  .version {
    color: $text-muted;
    font-size: 12px;
  }
}

.about-text {
  font-size: 13px;
  color: $text-secondary;
  line-height: 1.6;
  margin-bottom: 14px;
}

.endpoint-table {
  :deep(.n-data-table) {
    --n-td-color: transparent;
    --n-th-color: rgba($accent-primary, 0.04);
  }
}
</style>
