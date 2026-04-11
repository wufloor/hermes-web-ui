<script setup lang="ts">
import { ref } from 'vue'
import { NButton } from 'naive-ui'
import { useChatStore } from '@/stores/chat'

const chatStore = useChatStore()
const inputText = ref('')
const textareaRef = ref<HTMLTextAreaElement>()

function handleSend() {
  const text = inputText.value.trim()
  if (!text) return

  chatStore.sendMessage(text)
  inputText.value = ''

  // Reset textarea height
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto'
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function handleInput(e: Event) {
  const el = e.target as HTMLTextAreaElement
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 100) + 'px'
}
</script>

<template>
  <div class="chat-input-area">
    <div class="input-wrapper">
      <textarea
        ref="textareaRef"
        v-model="inputText"
        class="input-textarea"
        placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
        rows="1"
        @keydown="handleKeydown"
        @input="handleInput"
      ></textarea>
      <div class="input-actions">
        <NButton
          v-if="chatStore.isStreaming"
          size="small"
          type="error"
          @click="chatStore.stopStreaming()"
        >
          Stop
        </NButton>
        <NButton
          size="small"
          type="primary"
          :disabled="!inputText.trim() || chatStore.isStreaming"
          @click="handleSend"
        >
          <template #icon>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </template>
          Send
        </NButton>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.chat-input-area {
  padding: 12px 20px 16px;
  border-top: 1px solid $border-color;
  flex-shrink: 0;
}

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  background-color: $bg-input;
  border: 1px solid $border-color;
  border-radius: $radius-md;
  padding: 10px 12px;
  transition: border-color $transition-fast;

  &:focus-within {
    border-color: $accent-primary;
  }
}

.input-textarea {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: $text-primary;
  font-family: $font-ui;
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  max-height: 100px;
  min-height: 20px;
  overflow-y: auto;

  &::placeholder {
    color: $text-muted;
  }
}

.input-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
  align-items: center;
}
</style>
