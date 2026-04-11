<script setup lang="ts">
import { computed } from 'vue'
import type { Message } from '@/stores/chat'
import MarkdownRenderer from './MarkdownRenderer.vue'

const props = defineProps<{ message: Message }>()

const isSystem = computed(() => props.message.role === 'system')

const timeStr = computed(() => {
  const d = new Date(props.message.timestamp)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
})
</script>

<template>
  <div class="message" :class="[message.role]">
    <template v-if="message.role === 'tool'">
      <div class="tool-line">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="tool-icon"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
        <span class="tool-name">{{ message.toolName }}</span>
        <span v-if="message.toolPreview" class="tool-preview">{{ message.toolPreview }}</span>
      </div>
    </template>
    <template v-else>
      <div class="msg-body">
        <img v-if="message.role === 'assistant'" src="/assets/logo.png" alt="Hermes" class="msg-avatar" />
        <div class="msg-content" :class="message.role">
          <div class="message-bubble" :class="{ system: isSystem }">
            <MarkdownRenderer v-if="message.content" :content="message.content" />
            <span v-if="message.isStreaming" class="streaming-cursor"></span>
            <div v-if="message.isStreaming && !message.content" class="streaming-dots">
              <span></span><span></span><span></span>
            </div>
          </div>
          <div class="message-time">{{ timeStr }}</div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.message {
  display: flex;
  flex-direction: column;

  &.user {
    align-items: flex-end;

    .msg-body {
      max-width: 75%;
    }

    .msg-content.user {
      align-items: flex-end;
    }

    .message-bubble {
      background-color: $msg-user-bg;
      border-radius: $radius-md $radius-md 4px $radius-md;
    }
  }

  &.assistant {
    flex-direction: row;
    align-items: flex-start;
    gap: 8px;

    .msg-body {
      max-width: 80%;
    }

    .msg-avatar {
      width: 28px;
      height: 28px;
      border-radius: 4px;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .message-bubble {
      background-color: $msg-assistant-bg;
      border-radius: $radius-md $radius-md $radius-md 4px;
    }
  }

  &.tool {
    align-items: flex-start;
  }

  &.system {
    align-items: flex-start;

    .message-bubble.system {
      border-left: 3px solid $warning;
      border-radius: $radius-sm;
      max-width: 80%;
      background-color: rgba($warning, 0.06);
    }
  }
}

.msg-body {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  max-width: 85%;
}

.msg-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.message-bubble {
  padding: 10px 14px;
  font-size: 14px;
  line-height: 1.65;
  word-break: break-word;
}

.message-time {
  font-size: 11px;
  color: $text-muted;
  margin-top: 4px;
  padding: 0 4px;
}

.tool-line {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: $text-muted;
  padding: 0 4px;

  .tool-name {
    font-family: $font-code;
  }

  .tool-preview {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 400px;
  }
}

.streaming-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background-color: $text-muted;
  margin-left: 2px;
  vertical-align: text-bottom;
  animation: blink 0.8s infinite;
}

.streaming-dots {
  display: flex;
  gap: 4px;
  padding: 4px 0;

  span {
    width: 6px;
    height: 6px;
    background-color: $text-muted;
    border-radius: 50%;
    animation: pulse 1.4s infinite ease-in-out;

    &:nth-child(2) { animation-delay: 0.2s; }
    &:nth-child(3) { animation-delay: 0.4s; }
  }
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

@keyframes pulse {
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1); }
}
</style>
