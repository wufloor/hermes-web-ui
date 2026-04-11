<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { NModal, NForm, NFormItem, NInput, NButton, NSelect, NInputNumber, useMessage } from 'naive-ui'
import { useJobsStore } from '@/stores/jobs'

const props = defineProps<{
  jobId: string | null
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const jobsStore = useJobsStore()
const message = useMessage()

const showModal = ref(true)
const loading = ref(false)

const formData = ref({
  name: '',
  schedule: '',
  prompt: '',
  deliver: 'origin',
  repeat_times: null as number | null,
})

const presetValue = ref<string | null>(null)

const isEdit = computed(() => !!props.jobId)

const schedulePresets = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every 5 minutes', value: '*/5 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every day at 00:00', value: '0 0 * * *' },
  { label: 'Every day at 09:00', value: '0 9 * * *' },
  { label: 'Every Monday at 09:00', value: '0 9 * * 1' },
  { label: 'Every month 1st at 09:00', value: '0 9 1 * *' },
]

const targetOptions = [
  { label: 'Origin', value: 'origin' },
  { label: 'Local', value: 'local' },
]

onMounted(async () => {
  if (props.jobId) {
    try {
      const { getJob } = await import('@/api/jobs')
      const job = await getJob(props.jobId)
      formData.value = {
        name: job.name,
        schedule: typeof job.schedule === 'string' ? job.schedule : (job.schedule?.expr || job.schedule_display || ''),
        prompt: job.prompt,
        deliver: job.deliver || 'origin',
        repeat_times: typeof job.repeat === 'number' ? job.repeat : (typeof job.repeat === 'object' ? job.repeat.times : null),
      }
    } catch (e: any) {
      message.error('Failed to load job: ' + e.message)
    }
  }
})

async function handleSave() {
  if (!formData.value.name.trim()) {
    message.warning('Name is required')
    return
  }
  if (!formData.value.schedule.trim()) {
    message.warning('Schedule is required')
    return
  }

  loading.value = true
  try {
    const payload = {
      name: formData.value.name,
      schedule: formData.value.schedule,
      prompt: formData.value.prompt,
      deliver: formData.value.deliver,
      repeat: formData.value.repeat_times ?? undefined,
    }

    if (isEdit.value) {
      await jobsStore.updateJob(props.jobId!, payload)
      message.success('Job updated')
    } else {
      await jobsStore.createJob(payload)
      message.success('Job created')
    }
    emit('saved')
  } catch (e: any) {
    message.error(e.message)
  } finally {
    loading.value = false
  }
}

function handleClose() {
  showModal.value = false
  setTimeout(() => emit('close'), 200)
}
</script>

<template>
  <NModal
    v-model:show="showModal"
    preset="card"
    :title="isEdit ? 'Edit Job' : 'Create Job'"
    :style="{ width: '520px' }"
    :mask-closable="!loading"
    @after-leave="emit('close')"
  >
    <NForm label-placement="top">
      <NFormItem label="Name" required>
        <NInput
          v-model:value="formData.name"
          placeholder="Job name"
          maxlength="200"
          show-count
        />
      </NFormItem>

      <NFormItem label="Schedule (Cron Expression)" required>
        <NInput
          v-model:value="formData.schedule"
          placeholder="e.g. 0 9 * * *"
        />
      </NFormItem>

      <NFormItem label="Quick Presets">
        <NSelect
          v-model:value="presetValue"
          :options="schedulePresets"
          placeholder="Select a preset..."
          @update:value="v => formData.schedule = v"
        />
      </NFormItem>

      <NFormItem label="Prompt" required>
        <NInput
          v-model:value="formData.prompt"
          type="textarea"
          placeholder="The prompt to execute"
          :rows="4"
          maxlength="5000"
          show-count
        />
      </NFormItem>

      <NFormItem label="Deliver Target">
        <NSelect
          v-model:value="formData.deliver"
          :options="targetOptions"
        />
      </NFormItem>

      <NFormItem label="Repeat Count (optional)">
        <NInputNumber
          v-model:value="formData.repeat_times"
          :min="1"
          placeholder="Leave empty for infinite"
          clearable
          style="width: 100%"
        />
      </NFormItem>
    </NForm>

    <template #footer>
      <div class="modal-footer">
        <NButton @click="handleClose">Cancel</NButton>
        <NButton type="primary" :loading="loading" @click="handleSave">
          {{ isEdit ? 'Update' : 'Create' }}
        </NButton>
      </div>
    </template>
  </NModal>
</template>

<style scoped lang="scss">
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
