import { query, queryOne } from "../core/helpers";
import { getDbv, ensureSchema } from "../core/connection";
import type { ConnectionStateRow } from "../types";

export async function getConnectionState(): Promise<{ status?: string; qr_string?: string; phone?: string; updated_at?: number } | null> {
  const rows = await query<ConnectionStateRow>("SELECT key, value, updated_at FROM connection_state");
  if (rows.length === 0) return null;
  const state: Record<string, string | number | null> = {};
  for (const row of rows) {
    state[row.key] = row.value;
    state.updated_at = row.updated_at;
  }
  return state;
}

export async function setConnectionState(key: string, value: string): Promise<void> {
  const existing = await queryOne<ConnectionStateRow>("SELECT value FROM connection_state WHERE key = ?", [key]);
  if (existing) {
    await getDbv().execute({ sql: "UPDATE connection_state SET value = ?, updated_at = unixepoch() WHERE key = ?", args: [value, key] });
  } else {
    await getDbv().execute({ sql: "INSERT INTO connection_state (key, value) VALUES (?, ?)", args: [key, value] });
  }
}

export async function setConnectionStateBatch(states: { status?: string; qr_string?: string | null; phone?: string | null }): Promise<void> {
  await ensureSchema();
  const stmts: { sql: string; args: any[] }[] = [];
  if (states.status !== undefined) {
    stmts.push({ sql: "INSERT OR REPLACE INTO connection_state (key, value, updated_at) VALUES (?, ?, unixepoch())", args: ['status', states.status] });
  }
  if (states.qr_string !== undefined) {
    if (states.qr_string === null) {
      stmts.push({ sql: "DELETE FROM connection_state WHERE key = 'qr_string'", args: [] });
    } else {
      stmts.push({ sql: "INSERT OR REPLACE INTO connection_state (key, value, updated_at) VALUES (?, ?, unixepoch())", args: ['qr_string', states.qr_string] });
    }
  }
  if (states.phone !== undefined) {
    if (states.phone === null) {
      stmts.push({ sql: "DELETE FROM connection_state WHERE key = 'phone'", args: [] });
    } else {
      stmts.push({ sql: "INSERT OR REPLACE INTO connection_state (key, value, updated_at) VALUES (?, ?, unixepoch())", args: ['phone', states.phone] });
    }
  }
  if (stmts.length > 0) {
    await getDbv().batch(stmts);
  }
}

export async function getConnectionValue(key: string): Promise<string | null> {
  const rs = await getDbv().execute({ sql: "SELECT value FROM connection_state WHERE key = ?", args: [key] });
  return (rs.rows[0] as { value?: string } | undefined)?.value ?? null;
}

export async function getConnectionValueFlag(key: string): Promise<boolean> {
  const val = await getConnectionValue(key);
  return val !== null;
}

export async function setConnectionFlag(key: string): Promise<void> {
  await getDbv().execute({ sql: "INSERT OR REPLACE INTO connection_state (key, value, updated_at) VALUES (?, '1', unixepoch())", args: [key] });
}

export async function setConnectionValue(key: string, value: string): Promise<void> {
  await getDbv().execute({ sql: "INSERT OR REPLACE INTO connection_state (key, value, updated_at) VALUES (?, ?, unixepoch())", args: [key, value] });
}

export async function deleteConnectionKey(key: string): Promise<void> {
  await getDbv().execute({ sql: "DELETE FROM connection_state WHERE key = ?", args: [key] });
}
