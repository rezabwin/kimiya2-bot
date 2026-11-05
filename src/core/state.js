import { STATE_FIELD_PREFIXES, VALID_STATE_FIELDS } from "../config.js";
import { getTodayJalali } from "../lib/jalali.js";

export async function getState(env, chatId) {
  try {
    const r = await env.DB.prepare("SELECT * FROM user_states WHERE chat_id = ?").bind(chatId).first();
    return r || { chat_id: chatId };
  } catch (e) { return { chat_id: chatId }; }
}

export async function setStateField(env, chatId, field, value) {
  if (!VALID_STATE_FIELDS.has(field)) return;
  try {
    await env.DB.prepare(
      `INSERT INTO user_states (chat_id, ${field}, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(chat_id) DO UPDATE SET ${field} = excluded.${field}, updated_at = excluded.updated_at`
    ).bind(chatId, value, getTodayJalali()).run();
  } catch (e) {
    try {
      await env.DB.prepare(`UPDATE user_states SET ${field} = ?, updated_at = ? WHERE chat_id = ?`).bind(value, getTodayJalali(), chatId).run();
    } catch (e2) {}
  }
}

export async function deleteStateField(env, chatId, field) {
  if (!VALID_STATE_FIELDS.has(field)) return;
  try {
    await env.DB.prepare(`UPDATE user_states SET ${field} = NULL WHERE chat_id = ?`).bind(chatId).run();
  } catch (e) {}
}

export async function deleteAllState(env, chatId) {
  try {
    const fields = Array.from(VALID_STATE_FIELDS).map((f) => `${f} = NULL`).join(", ");
    await env.DB.prepare(`UPDATE user_states SET ${fields} WHERE chat_id = ?`).bind(chatId).run();
  } catch (e) {}
}

export async function kvGet(env, key) {
  for (const [prefix, field] of Object.entries(STATE_FIELD_PREFIXES)) {
    if (key.startsWith(prefix)) {
      const chatId = parseInt(key.substring(prefix.length));
      if (isNaN(chatId)) return null;
      const state = await getState(env, chatId);
      return state[field] || null;
    }
  }
  try { return await env.KV.get(key); } catch { return null; }
}

export async function kvPut(env, key, value) {
  for (const [prefix, field] of Object.entries(STATE_FIELD_PREFIXES)) {
    if (key.startsWith(prefix)) {
      const chatId = parseInt(key.substring(prefix.length));
      if (isNaN(chatId)) return;
      await setStateField(env, chatId, field, value);
      return;
    }
  }
  try { await env.KV.put(key, value); } catch (e) {}
}

export async function kvDelete(env, key) {
  for (const [prefix, field] of Object.entries(STATE_FIELD_PREFIXES)) {
    if (key.startsWith(prefix)) {
      const chatId = parseInt(key.substring(prefix.length));
      if (isNaN(chatId)) return;
      await deleteStateField(env, chatId, field);
      return;
    }
  }
  try { await env.KV.delete(key); } catch (e) {}
}
