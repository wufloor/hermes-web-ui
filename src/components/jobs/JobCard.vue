<script setup lang="ts">
import { computed } from 'vue'
import { NButton, NTooltip, useMessage } from 'naive-ui'
import type { Job } from '@/api/jobs'
import { useJobsStore } from '@/stores/jobs'

const props = defineProps<{ job: Job }>()
const emit = defineEmits<{
  edit: [jobId: string]
}>()

const jobsStore = useJobsStore()
const message = useMessage()

const jobId = computed(() => props.job.job_id || props.job.id)

const statusLabel = computed(() => {
  if (props.job.state === 'running') return 'Running'
  if (props.job.state === 'paused') return 'Paused'
  if (!props.job.enabled) return 'Disabled'
  return 'Scheduled'
})

const statusType = computed(() => {
  if (props.job.state === 'running') return 'info' as const
  if (props.job.state === 'paused') return 'warning' as const
  if (!props.job.enabled) return 'error' as const
  return 'success' as const
})

const scheduleExpr = computed(() => {
  const s = props.job.schedule
  if (typeof s === 'string') return s
  return s?.expr || props.job.schedule_display || '—'
})

const formatTime = (t?: string | null) => {
  if (!t) return '—'
  return new Date(t).toLocaleString()
}

async function handlePause() {
  try {
    await jobsStore.pauseJob(jobId.value)
    message.success('Job paused')
  } catch (e: any) {
    message.error(e.message)
  }
}

async function handleResume() {
  try {
    await jobsStore.resumeJob(jobId.value)
    message.success('Job resumed')
  } catch (e: any) {
    message.error(e.message)
  }
}

async function handleRun() {
  try {
    await jobsStore.runJob(jobId.value)
    message.info('Job triggered')
  } catch (e: any) {
    message.error(e.message)
  }
}

async function handleDelete() {
  try {
    await jobsStore.deleteJob(jobId.value)
    message.success('Job deleted')
  } catch (e: any) {
    message.error(e.message)
  }
}
</script>

<template>
  <div class="job-card">
    <div class="card-header">
      <h3 class="job-name">{{ job.name }}</h3>
      <span class="status-badge" :class="statusType">{{ statusLabel }}</span>
    </div>

    <div class="card-body">
      <div class="info-row">
        <span class="info-label">Schedule</span>
        <code class="info-value mono">{{ scheduleExpr }}</code>
      </div>
      <div class="info-row">
        <span class="info-label">Last Run</span>
        <span class="info-value">
          {{ formatTime(job.last_run_at) }}
          <span v-if="job.last_status" class="run-status" :class="{ ok: job.last_status === 'ok', err: job.last_status !== 'ok' }">
            {{ job.last_status === 'ok' ? 'OK' : job.last_status }}
          </span>
        </span>
      </div>
      <div class="info-row">
        <span class="info-label">Next Run</span>
        <span class="info-value">{{ formatTime(job.next_run_at) }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Deliver</span>
        <span class="info-value">{{ job.deliver }}<template v-if="job.origin"> ({{ job.origin.platform }})</template></span>
      </div>
      <div v-if="job.repeat" class="info-row">
        <span class="info-label">Repeat</span>
        <span class="info-value">
          <template v-if="typeof job.repeat === 'string'">{{ job.repeat }}</template>
          <template v-else>{{ job.repeat.completed }} / {{ job.repeat.times ?? '∞' }}</template>
        </span>
      </div>
    </div>

    <div class="card-actions">
      <NTooltip v-if="job.state !== 'paused' && job.enabled">
        <template #trigger>
          <NButton size="tiny" quaternary @click="handlePause">Pause</NButton>
        </template>
        Pause job
      </NTooltip>
      <NTooltip v-else-if="job.state === 'paused'">
        <template #trigger>
          <NButton size="tiny" quaternary @click="handleResume">Resume</NButton>
        </template>
        Resume job
      </NTooltip>
      <NTooltip>
        <template #trigger>
          <NButton size="tiny" quaternary @click="handleRun">Run Now</NButton>
        </template>
        Trigger immediately
      </NTooltip>
      <NButton size="tiny" quaternary @click="emit('edit', jobId)">Edit</NButton>
      <NButton size="tiny" quaternary type="error" @click="handleDelete">Delete</NButton>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.job-card {
  background-color: $bg-card;
  border: 1px solid $border-color;
  border-radius: $radius-md;
  padding: 16px;
  transition: border-color $transition-fast;

  &:hover {
    border-color: rgba($accent-primary, 0.3);
  }
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.job-name {
  font-size: 15px;
  font-weight: 600;
  color: $text-primary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 70%;
}

.status-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;

  &.success {
    background: rgba($success, 0.12);
    color: $success;
  }

  &.info {
    background: rgba($accent-primary, 0.12);
    color: $accent-primary;
  }

  &.warning {
    background: rgba($warning, 0.12);
    color: $warning;
  }

  &.error {
    background: rgba($error, 0.12);
    color: $error;
  }
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-size: 12px;
  color: $text-muted;
}

.info-value {
  font-size: 12px;
  color: $text-secondary;
}

.run-status {
  margin-left: 6px;
  font-size: 11px;
  font-weight: 500;

  &.ok { color: $success; }
  &.err { color: $error; }
}

.mono {
  font-family: $font-code;
  font-size: 12px;
}

.card-actions {
  display: flex;
  gap: 4px;
  border-top: 1px solid $border-light;
  padding-top: 10px;
}
</style>
