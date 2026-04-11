<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const selectedKey = computed(() => route.name as string)

function handleNav(key: string) {
  router.push({ name: key })
}
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-logo" @click="router.push('/')">
      <img src="/assets/logo.png" alt="Hermes" class="logo-img" />
      <span class="logo-text">Hermes</span>
    </div>

    <nav class="sidebar-nav">
      <button
        class="nav-item"
        :class="{ active: selectedKey === 'chat' }"
        @click="handleNav('chat')"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span>Chat</span>
      </button>

      <button
        class="nav-item"
        :class="{ active: selectedKey === 'jobs' }"
        @click="handleNav('jobs')"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span>Jobs</span>
      </button>
    </nav>

    <div class="sidebar-footer">
      <div class="status-indicator" :class="{ connected: appStore.connected, disconnected: !appStore.connected }">
        <span class="status-dot"></span>
        <span class="status-text">{{ appStore.connected ? 'Connected' : 'Disconnected' }}</span>
      </div>
      <div class="version-info">Hermes {{ appStore.serverVersion || 'v0.1.0' }}</div>
    </div>
  </aside>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.sidebar {
  width: $sidebar-width;
  height: 100vh;
  background-color: $bg-sidebar;
  border-right: 1px solid $border-color;
  display: flex;
  flex-direction: column;
  padding: 20px 12px;
  flex-shrink: 0;
  transition: width $transition-normal;
}

.logo-img {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  flex-shrink: 0;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 12px 20px;
  color: $text-primary;
  cursor: pointer;

  .logo-text {
    font-size: 18px;
    font-weight: 600;
    letter-spacing: 0.5px;
  }
}

.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: none;
  background: none;
  color: $text-secondary;
  font-size: 14px;
  border-radius: $radius-sm;
  cursor: pointer;
  transition: all $transition-fast;
  width: 100%;
  text-align: left;

  &:hover {
    background-color: rgba($accent-primary, 0.06);
    color: $text-primary;
  }

  &.active {
    background-color: rgba($accent-primary, 0.12);
    color: $accent-primary;
  }
}

.sidebar-footer {
  padding-top: 16px;
  border-top: 1px solid $border-color;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 12px;

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  &.connected .status-dot {
    background-color: $success;
    box-shadow: 0 0 6px rgba($success, 0.5);
  }

  &.disconnected .status-dot {
    background-color: $error;
  }

  .status-text {
    color: $text-secondary;
  }
}

.version-info {
  padding: 4px 12px;
  font-size: 11px;
  color: $text-muted;
}
</style>
