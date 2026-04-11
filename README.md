# Hermes UI

Hermes Agent 的 Web 管理面板，用于对话交互和定时任务管理。

## 技术栈

- **Vue 3** — Composition API + `<script setup>`
- **TypeScript**
- **Vite** — 构建工具
- **Naive UI** — 组件库
- **Pinia** — 状态管理
- **Vue Router** — 路由（Hash 模式）
- **SCSS** — 样式预处理
- **markdown-it** + **highlight.js** — Markdown 渲染与代码高亮

## 快速开始

### 1. 配置 API Server

编辑 `~/.hermes/config.yaml`，启用 API Server：

```yaml
platforms:
  api_server:
    enabled: true
    host: "127.0.0.1"
    port: 8642
    key: ""
    cors_origins: "*"
```

重启 Gateway 使配置生效：

```bash
hermes gateway restart
```

### 2. 安装并启动

```bash
# 全局安装
npm install -g hermes-web-ui

# 启动 Web 面板（默认 http://localhost:8648）
hermes-web-ui start
```

### 开发模式

```bash
# 克隆项目后
npm install
npm run dev
```

## 项目结构

```
src/
├── api/
│   ├── client.ts              # HTTP 请求封装（fetch + Bearer Auth）
│   ├── chat.ts                # 对话 API（startRun + SSE 事件流）
│   ├── jobs.ts                # 定时任务 CRUD
│   └── system.ts              # 健康检查、模型列表
├── stores/
│   ├── app.ts                 # 全局状态（连接状态、版本、模型）
│   ├── chat.ts                # 对话状态（消息、会话、流式输出）
│   └── jobs.ts                # 任务状态（列表、CRUD 操作）
├── components/
│   ├── layout/
│   │   └── AppSidebar.vue     # 侧边栏导航
│   ├── chat/
│   │   ├── ChatPanel.vue      # 对话面板（会话列表 + 聊天区域）
│   │   ├── MessageList.vue    # 消息列表（自动滚动、加载动画）
│   │   ├── MessageItem.vue    # 单条消息（用户/AI/工具/系统）
│   │   ├── ChatInput.vue      # 输入框（Ctrl+Enter 发送）
│   │   └── MarkdownRenderer.vue # Markdown 渲染（代码高亮、复制）
│   └── jobs/
│       ├── JobsPanel.vue      # 任务面板
│       ├── JobCard.vue        # 任务卡片
│       └── JobFormModal.vue   # 创建/编辑任务弹窗
├── views/
│   ├── ChatView.vue           # 对话页
│   └── JobsView.vue           # 任务页
├── router/
│   └── index.ts               # 路由配置
├── styles/
│   ├── variables.scss         # SCSS 设计变量
│   ├── global.scss            # 全局样式
│   └── theme.ts               # Naive UI 主题覆盖
├── composables/
│   └── useKeyboard.ts         # 键盘快捷键
└── main.ts                    # 应用入口
```

## 功能特性

### 对话（Chat）

- 基于 `/v1/runs` + `/v1/runs/{id}/events` 的异步 Run + SSE 事件流
- 实时流式输出，工具调用进度可视化
- 多会话管理，会话历史持久化到 localStorage
- Markdown 渲染，代码块语法高亮与一键复制

### 定时任务（Jobs）

- 任务列表查看（含暂停/禁用任务）
- 创建、编辑、删除任务
- 暂停/恢复任务
- 立即触发任务执行
- Cron 表达式快速预设

### 其他

- 连接状态实时检测（30s 轮询）
- 纯黑白主题
- 键盘快捷键支持

---

## API 接口文档

Base URL: `http://127.0.0.1:8642`

### 认证

除 `/health` 外，所有接口支持 Bearer Token 认证（如果服务端配置了 `key`）：

```
Authorization: Bearer <your-api-key>
```

未配置 key 时所有请求放行。

### 通用错误格式

```json
{
  "error": {
    "message": "错误描述",
    "type": "invalid_request_error",
    "param": null,
    "code": "invalid_api_key"
  }
}
```

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | API Key 无效 |
| 404 | 资源不存在 |
| 413 | 请求体过大（上限 1MB） |
| 429 | 并发超限（最大 10 个 Run） |
| 500 | 服务器内部错误 |

---

### 1. 健康检查

**GET** `/health` 或 `/v1/health`

无需认证。

```json
{"status": "ok", "platform": "hermes-agent"}
```

---

### 2. 模型列表

**GET** `/v1/models`

```json
{
  "object": "list",
  "data": [
    {
      "id": "hermes-agent",
      "object": "model",
      "created": 1744348800,
      "owned_by": "hermes"
    }
  ]
}
```

---

### 3. Chat Completions（OpenAI 兼容）

**POST** `/v1/chat/completions`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| messages | array | Y | 消息数组，格式同 OpenAI |
| stream | boolean | N | 是否流式返回，默认 false |
| model | string | N | 模型名，默认 "hermes-agent" |

可选 Header: `X-Hermes-Session-Id` 指定会话 ID。

**stream=false 响应：**
```json
{
  "id": "chatcmpl-xxxxx",
  "object": "chat.completion",
  "created": 1744348800,
  "model": "hermes-agent",
  "choices": [{"index": 0, "message": {"role": "assistant", "content": "回复内容"}, "finish_reason": "stop"}],
  "usage": {"prompt_tokens": 100, "completion_tokens": 50, "total_tokens": 150}
}
```

**stream=true 响应：** SSE 流（`Content-Type: text/event-stream`）
```
data: {"id":"chatcmpl-xxx","choices":[{"delta":{"content":"你"},"index":0}]}
data: [DONE]
```

---

### 4. Responses（有状态链式对话）

**POST** `/v1/responses`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| input | string / array | Y | 用户输入 |
| instructions | string | N | 系统指令 |
| previous_response_id | string | N | 链式对话的上一次响应 ID |
| conversation | string | N | 会话名称，自动链式到最新响应 |
| conversation_history | array | N | 显式传入对话历史 |
| store | boolean | N | 是否存储响应，默认 true |
| truncation | string | N | 设为 "auto" 自动截断历史到 100 条 |
| model | string | N | 模型名 |

> `conversation` 和 `previous_response_id` 互斥。

可选 Header: `Idempotency-Key` 幂等键。

```json
{
  "id": "resp_xxx",
  "object": "response",
  "status": "completed",
  "created_at": 1744348800,
  "output": [{"type": "message", "role": "assistant", "content": "回复内容"}],
  "usage": {"input_tokens": 100, "output_tokens": 50, "total_tokens": 150}
}
```

---

### 5. 获取 / 删除存储的响应

**GET** `/v1/responses/{response_id}` — 获取存储的响应

**DELETE** `/v1/responses/{response_id}` — 删除存储的响应

```json
{"id": "resp_xxx", "object": "response", "deleted": true}
```

---

### 6. 启动异步 Run

**POST** `/v1/runs`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| input | string / array | Y | 用户输入 |
| instructions | string | N | 系统指令 |
| previous_response_id | string | N | 链式对话 ID |
| conversation_history | array | N | 对话历史 |
| session_id | string | N | 会话 ID，默认使用 run_id |

```json
{"run_id": "run_xxx", "status": "started"}
```

---

### 7. SSE 事件流

**GET** `/v1/runs/{run_id}/events`

`Content-Type: text/event-stream`

**事件类型：**

| 事件 | 说明 |
|------|------|
| `run.started` | Run 开始 |
| `message.delta` | 消息内容片段（字段 `delta`） |
| `tool.started` | 工具调用开始（字段 `tool`、`preview`） |
| `tool.completed` | 工具调用完成（字段 `tool`、`duration`） |
| `run.completed` | Run 完成（字段 `output`、`usage`） |
| `run.failed` | Run 失败（字段 `error`） |

示例：
```
data: {"event":"message.delta","run_id":"run_xxx","delta":"你好","timestamp":...}
data: {"event":"tool.started","run_id":"run_xxx","tool":"browser_navigate","preview":"https://...","timestamp":...}
data: {"event":"tool.completed","run_id":"run_xxx","tool":"browser_navigate","duration":3.8,"timestamp":...}
data: {"event":"run.completed","run_id":"run_xxx","output":"完整回复","usage":{"input_tokens":100,"output_tokens":50,"total_tokens":150}}
```

---

### 8. 定时任务

#### 列出任务

**GET** `/api/jobs?include_disabled=true`

```json
{
  "jobs": [
    {
      "job_id": "61a5eb0baeb9",
      "name": "任务名",
      "schedule": "0 9 * * *",
      "repeat": "forever",
      "deliver": "origin",
      "next_run_at": "2026-04-12T09:00:00+08:00",
      "last_run_at": "2026-04-11T09:04:25+08:00",
      "last_status": "ok",
      "enabled": true,
      "state": "scheduled",
      "prompt_preview": "...",
      "skills": []
    }
  ]
}
```

#### 创建任务

**POST** `/api/jobs`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | Y | 任务名称（最大 200 字符） |
| schedule | string | Y | Cron 表达式 |
| prompt | string | N | 任务 prompt |
| deliver | string | N | 投递目标（origin / local / telegram / discord） |
| skills | array | N | skill 名称数组 |
| repeat | integer | N | 重复次数，不传表示永久 |

响应包裹在 `{"job": {...}}` 中。

#### 查看任务详情

**GET** `/api/jobs/{job_id}`

#### 更新任务

**PATCH** `/api/jobs/{job_id}`

可更新字段：`name`、`schedule`、`prompt`、`deliver`、`skills`、`repeat`、`enabled`

#### 删除任务

**DELETE** `/api/jobs/{job_id}`

```json
{"ok": true}
```

#### 暂停任务

**POST** `/api/jobs/{job_id}/pause`

```json
{"job": {"job_id": "xxx", "enabled": false, "state": "paused", ...}}
```

#### 恢复任务

**POST** `/api/jobs/{job_id}/resume`

```json
{"job": {"job_id": "xxx", "enabled": true, "state": "scheduled", ...}}
```

#### 立即触发任务

**POST** `/api/jobs/{job_id}/run`

```json
{"job": {"job_id": "xxx", "state": "scheduled", ...}}
```

---

## 快速测试

```bash
# 健康检查
curl http://127.0.0.1:8642/health

# 模型列表
curl http://127.0.0.1:8642/v1/models

# Chat Completions
curl -X POST http://127.0.0.1:8642/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"你好"}]}'

# 启动异步 Run
curl -X POST http://127.0.0.1:8642/v1/runs \
  -H "Content-Type: application/json" \
  -d '{"input":"你好"}'

# 监听 Run 事件流
curl http://127.0.0.1:8642/v1/runs/{run_id}/events

# 列出任务（含已暂停）
curl "http://127.0.0.1:8642/api/jobs?include_disabled=true"

# 创建任务
curl -X POST http://127.0.0.1:8642/api/jobs \
  -H "Content-Type: application/json" \
  -d '{"name":"测试任务","schedule":"0 9 * * *","prompt":"执行测试"}'

# 暂停 / 恢复 / 触发 / 删除
curl -X POST http://127.0.0.1:8642/api/jobs/{job_id}/pause
curl -X POST http://127.0.0.1:8642/api/jobs/{job_id}/resume
curl -X POST http://127.0.0.1:8642/api/jobs/{job_id}/run
curl -X DELETE http://127.0.0.1:8642/api/jobs/{job_id}
```
