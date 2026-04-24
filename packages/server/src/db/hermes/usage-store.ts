import { isSqliteAvailable, ensureTable, getDb, jsonSet, jsonGet, jsonGetAll, jsonDelete } from '../index'

const TABLE = 'session_usage'

const SCHEMA = {
  session_id: 'TEXT PRIMARY KEY',
  input_tokens: 'INTEGER NOT NULL DEFAULT 0',
  output_tokens: 'INTEGER NOT NULL DEFAULT 0',
  last_input_tokens: 'INTEGER NOT NULL DEFAULT 0',
  updated_at: 'INTEGER NOT NULL',
}

export interface UsageRecord {
  input_tokens: number
  output_tokens: number
  /**
   * Approximate size of the most recent run's prompt (in tokens).
   * Computed by callers as `max(0, new_session_total - prev_session_total)`.
   * Used by the UI context-window gauge to show current context fill
   * instead of cumulative session usage (see #167).
   */
  last_input_tokens: number
}

export function initUsageStore(): void {
  if (isSqliteAvailable()) {
    ensureTable(TABLE, SCHEMA)
  }
}

export function updateUsage(
  sessionId: string,
  inputTokens: number,
  outputTokens: number,
  lastInputTokens?: number,
): void {
  const updated_at = Date.now()
  if (isSqliteAvailable()) {
    const db = getDb()!
    db.prepare(
      `INSERT INTO ${TABLE} (session_id, input_tokens, output_tokens, last_input_tokens, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(session_id) DO UPDATE SET
         input_tokens = excluded.input_tokens,
         output_tokens = excluded.output_tokens,
         last_input_tokens = excluded.last_input_tokens,
         updated_at = excluded.updated_at`,
    ).run(sessionId, inputTokens, outputTokens, lastInputTokens ?? 0, updated_at)
  } else {
    const record: Record<string, number> = { input_tokens: inputTokens, output_tokens: outputTokens, updated_at }
    if (lastInputTokens !== undefined) record.last_input_tokens = lastInputTokens
    jsonSet(TABLE, sessionId, record)
  }
}

export function getUsage(sessionId: string): UsageRecord | undefined {
  let row: any
  if (isSqliteAvailable()) {
    row = getDb()!.prepare(
      `SELECT input_tokens, output_tokens, last_input_tokens FROM ${TABLE} WHERE session_id = ?`,
    ).get(sessionId)
  } else {
    row = jsonGet(TABLE, sessionId)
  }
  if (!row) return undefined
  return {
    input_tokens: row.input_tokens ?? 0,
    output_tokens: row.output_tokens ?? 0,
    last_input_tokens: row.last_input_tokens ?? 0,
  }
}

export function getUsageBatch(
  sessionIds: string[],
): Record<string, UsageRecord> {
  if (sessionIds.length === 0) return {}
  const map: Record<string, UsageRecord> = {}
  if (isSqliteAvailable()) {
    const db = getDb()!
    const placeholders = sessionIds.map(() => '?').join(',')
    const rows = db.prepare(
      `SELECT session_id, input_tokens, output_tokens, last_input_tokens FROM ${TABLE} WHERE session_id IN (${placeholders})`,
    ).all(...sessionIds) as Array<any>
    for (const r of rows) {
      map[r.session_id] = {
        input_tokens: r.input_tokens ?? 0,
        output_tokens: r.output_tokens ?? 0,
        last_input_tokens: r.last_input_tokens ?? 0,
      }
    }
    return map
  }
  const all = jsonGetAll(TABLE)
  for (const id of sessionIds) {
    const row = all[id]
    if (row) {
      map[id] = {
        input_tokens: row.input_tokens ?? 0,
        output_tokens: row.output_tokens ?? 0,
        last_input_tokens: row.last_input_tokens ?? 0,
      }
    }
  }
  return map
}

export function deleteUsage(sessionId: string): void {
  if (isSqliteAvailable()) {
    getDb()!.prepare(`DELETE FROM ${TABLE} WHERE session_id = ?`).run(sessionId)
  } else {
    jsonDelete(TABLE, sessionId)
  }
}
