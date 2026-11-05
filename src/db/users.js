import { getTodayJalali } from "../lib/jalali.js";
import { normalizePhone } from "../lib/validators.js";

export async function getPhonesList(env) {
  try {
    const r = await env.DB.prepare("SELECT phone FROM allowed_phones ORDER BY phone ASC").all();
    return (r.results || []).map((row) => row.phone);
  } catch { return []; }
}

export async function addPhoneToD1(env, phone, addedBy = 0, note = "") {
  try {
    await env.DB.prepare("INSERT OR IGNORE INTO allowed_phones (phone, added_date, added_by, note) VALUES (?, ?, ?, ?)").bind(normalizePhone(phone), getTodayJalali(), addedBy, note).run();
    return true;
  } catch { return false; }
}

export async function removePhoneFromD1(env, phone) {
  try {
    await env.DB.prepare("DELETE FROM allowed_phones WHERE phone = ?").bind(normalizePhone(phone)).run();
    return true;
  } catch { return false; }
}

export async function saveUserToD1(env, chatId, phone, name, className, firstName = "") {
  try {
    const existing = await env.DB.prepare("SELECT chat_id FROM users WHERE chat_id = ?").bind(chatId).first();
    if (existing) {
      await env.DB.prepare(`UPDATE users SET phone = ?, student_name = ?, student_class = ?, first_name = ?, blocked = 0, last_seen = ? WHERE chat_id = ?`).bind(phone || "", name || "", className || "", firstName || "", getTodayJalali(), chatId).run();
    } else {
      await env.DB.prepare(`INSERT INTO users (chat_id, phone, student_name, student_class, first_name, joined_date, last_seen, blocked) VALUES (?, ?, ?, ?, ?, ?, ?, 0)`).bind(chatId, phone || "", name || "", className || "", firstName || "", getTodayJalali(), getTodayJalali()).run();
    }
    return true;
  } catch (e) { return false; }
}

export async function saveUserAuth(env, chatId, phone, firstName = "") {
  try {
    const existing = await env.DB.prepare("SELECT chat_id FROM users WHERE chat_id = ?").bind(chatId).first();
    if (existing) {
      await env.DB.prepare("UPDATE users SET phone = ?, first_name = ?, last_seen = ? WHERE chat_id = ?").bind(phone, firstName, getTodayJalali(), chatId).run();
    } else {
      await env.DB.prepare(`INSERT INTO users (chat_id, phone, first_name, student_name, student_class, joined_date, last_seen, blocked) VALUES (?, ?, ?, '', '', ?, ?, 0)`).bind(chatId, phone, firstName, getTodayJalali(), getTodayJalali()).run();
    }
    return true;
  } catch { return false; }
}

export async function getUserProfile(env, chatId) {
  try {
    const r = await env.DB.prepare("SELECT student_name, student_class, first_name FROM users WHERE chat_id = ?").bind(chatId).first();
    if (!r) return null;
    return { name: r.student_name || "", className: r.student_class || "", firstName: r.first_name || "" };
  } catch { return null; }
}

export async function updateUserProfileName(env, chatId, name) {
  try { await env.DB.prepare("UPDATE users SET student_name = ? WHERE chat_id = ?").bind(name, chatId).run(); } catch {}
}

export async function updateUserProfileClass(env, chatId, className) {
  try { await env.DB.prepare("UPDATE users SET student_class = ? WHERE chat_id = ?").bind(className, chatId).run(); } catch {}
}

export async function getUserChatIdByPhone(env, phone) {
  try {
    const r = await env.DB.prepare("SELECT chat_id FROM users WHERE phone = ? AND (blocked = 0 OR blocked IS NULL)").bind(normalizePhone(phone)).first();
    return r?.chat_id || null;
  } catch { return null; }
}

export async function getAllUsersFromD1(env) {
  try {
    const r = await env.DB.prepare("SELECT * FROM users WHERE (blocked = 0 OR blocked IS NULL) AND chat_id IS NOT NULL").all();
    return r.results || [];
  } catch { return []; }
}

export async function countUsersInD1(env) {
  try {
    const r = await env.DB.prepare("SELECT COUNT(*) as count FROM users WHERE (blocked = 0 OR blocked IS NULL)").first();
    return r?.count || 0;
  } catch { return 0; }
}

export async function unblockUser(env, chatId) {
  try { await env.DB.prepare("UPDATE users SET blocked = 0 WHERE chat_id = ?").bind(chatId).run(); } catch {}
}

export async function isUserBlocked(env, chatId) {
  try {
    const r = await env.DB.prepare("SELECT blocked FROM users WHERE chat_id = ?").bind(chatId).first();
    return r && r.blocked === 1;
  } catch { return false; }
}
