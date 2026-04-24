# WIP: #167 上下文用量条精度问题

> 本文档记录 issue [#167](https://github.com/EKKOLearnAI/hermes-web-ui/issues/167) 的排查与阶段性实现；**尚未合入 main，等待上游条件成熟后再重启**。代码位于分支 `wip/167-usage-gauge-accuracy`。

## 1. 原始问题

在 Chat 界面左下角的上下文用量条，长会话中出现：

```
1.5M / 200.0k · 剩余 -1251971
```

剩余 tokens 为负，显示异常。

## 2. 根因分析

UI 用于计算的两个值语义完全不在同一维度：

- **分子** `inputTokens + outputTokens`：来自 `activeSession`，本质是 gateway 的 `session_prompt_tokens + session_completion_tokens`，**agent 生命周期内跨所有 run 累加**。
- **分母** `contextLength`：是**单次请求**的模型 context window 上限（例如 200k）。

长会话做了很多轮就会把分子累加到 1M+，与分母 200k 相比自然出现负剩余。

## 3. 已实现的阶段性修复（本分支）

思路：在 web-ui 层增补"最近一轮 prompt 大小"的估算字段 `last_input_tokens`，gauge 用它替代累加总量。

### 3.1 后端

- `packages/server/src/db/hermes/usage-store.ts`
  - 给 `session_usage` 表新增 `last_input_tokens: INTEGER NOT NULL DEFAULT 0`（`ensureTable` 自动 ALTER）
  - `updateUsage(sessionId, input, output, lastInput?)` 签名扩展
  - `getUsage` / `getUsageBatch` 返回新字段，legacy 行返回 0
- `packages/server/src/routes/hermes/proxy-handler.ts`
  - 拦截 `run.completed` SSE，对每个 session 计算：
    - `new > prev` → `last = new - prev`（同一 agent 生命周期内增量）
    - `new <= prev` → `last = new`（检测到 agent 重建/session 恢复，直接用新累计作为增量）
- `packages/server/src/controllers/hermes/sessions.ts`
  - `/api/hermes/sessions/:id/usage` 默认响应补 `last_input_tokens: 0`

### 3.2 前端

- `packages/client/src/api/hermes/sessions.ts`：API 类型加 `last_input_tokens?`
- `packages/client/src/stores/hermes/chat.ts`：
  - `Session` 接口加 `lastInputTokens?`
  - `switchSession` 拉取时赋值
  - SSE `run.completed` 后再次 `fetchSessionUsageSingle` 拉取后端计算好的最新值
- `packages/client/src/components/hermes/chat/ChatInput.vue`：
  - `currentContextFill` 优先取 `lastInputTokens`；当 `lastInputTokens === 0` 但 `inputTokens > 0`（legacy 数据）时 fallback 到 `inputTokens`
  - `remainingTokens = Math.max(0, contextLength - currentContextFill)` 钳位

### 3.3 测试

- `tests/server/usage-store.test.ts`：JSON 与 SQLite 双路径验证新字段默认值、读写、legacy 兼容
- `tests/server/proxy-handler.test.ts`:新增两个用例覆盖 delta 计算与 agent 重建的回退

测试命令：

```bash
npx vitest run tests/server/usage-store.test.ts tests/server/proxy-handler.test.ts
# 36/36 通过
npm test
# 262/262 通过
npm run build
# 构建通过
```

## 4. 暂停原因：精度不达标

本地验证会话 `mocy8hp290d7gs` 时发现数字与真实上下文占用仍有明显差距：

| 来源 | input_tokens | 含义 |
|---|---|---|
| Gateway SSE `run.completed` | 13,486 | `session_prompt_tokens`，不含 cache hit |
| Hermes CLI `sessions export` | 66,042 | `session_input_tokens`，canonical 累加 |
| CLI `cache_read_tokens` | 45,156 | **gateway SSE 未暴露** |

启用 prompt caching 后大部分 context 走 `cache_read`，每轮真正新增的 `prompt_tokens` 常常只有几十到几百。gauge 应反映"最近一轮 LLM 实际看到的 context"，即 `prompt_tokens + cache_read_tokens`，但上游 `run.completed` 事件没有 `cache_read_tokens` 字段，web-ui 无法拿到。

结论：**本方案能把剩余值从负数修正回非负，但对开启缓存的场景数值偏低，不能真实反映当前上下文窗口占用。**

## 5. 重启路径（三选一或组合）

### A. 止血派（最小风险）

合入本分支的代码，PR 描述中明确说明"数字为下限估算，缓存场景会偏低"；同时给上游 `hermes-agent` 提 issue 请求扩展 SSE 字段。

### B. 换口径（数字准但语义偏）

改用 Hermes CLI 的 session cumulative（`input_tokens + cache_read_tokens`）每轮刷新，数字和 CLI 对齐，但它是"整场会话总量"而不是"当前窗口占用"，概念层面仍与 context window 不完全匹配。

### C. 上游优先（最准，周期最长）

先给 `NousResearch/hermes-agent` 提 PR，在 `run.completed` 的 usage payload 里加 `last_prompt_tokens` 与 `last_cache_read_tokens`（当前 LLM 调用的瞬时值，而非 session 累加）。上游合入后，web-ui 直接读这两个字段即可精确渲染。

**推荐组合**：A 立即合入止血 + 并行推进 C，C 到位后把 web-ui 换成精确实现。

## 6. 上游相关代码指针

参考 `~/.hermes/hermes-agent/` 本地 clone：

- `gateway/platforms/api_server.py:2212-2226` — `run.completed` 事件 payload 构造位置，需要在此加上 `last_prompt_tokens` / `last_cache_read_tokens`
- `run_agent.py:9805-9813` — `session_*` 计数器累加位置，需要同时维护"最近一次 LLM call 的 prompt_tokens / cache_read_tokens"
- `run_agent.py:1624-1632, 1724-1735` — 计数器初始化位置（agent 构建 / `_init_session_counters`）

## 7. 代码改动清单（本分支对 upstream/main 的 diff）

```
packages/client/src/api/hermes/sessions.ts
packages/client/src/components/hermes/chat/ChatInput.vue
packages/client/src/stores/hermes/chat.ts
packages/server/src/controllers/hermes/sessions.ts
packages/server/src/db/hermes/usage-store.ts
packages/server/src/routes/hermes/proxy-handler.ts
tests/server/proxy-handler.test.ts
tests/server/usage-store.test.ts
docs/wip/167-usage-gauge.md  (本文档)
```

## 8. 重启 checklist

当决定恢复本工作时：

1. 确认采用的方案（A / B / C / 组合）
2. 若走 C，先确认上游 PR 状态与字段命名
3. `git checkout wip/167-usage-gauge-accuracy && git rebase upstream/main`
4. 跑 `npm test && npm run build`
5. 依据选定方案补充/替换实现
6. 真实会话端到端验证：gauge 数字合理、剩余不再为负、`cache_read` 场景数值接近 CLI 口径
7. 按惯例提交：中文 commit + `Co-authored-by: Copilot <...>`，PR 描述用英文
