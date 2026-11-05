import { getTodayJalali } from "../lib/jalali.js";

export async function saveMessageToD1(env, data) {
  try {
    await env.DB.prepare(
      `INSERT INTO messages (sender_chat_id, sender_type, parent_chat_id, parent_name, parent_class, parent_phone, text, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`
    ).bind(data.sender_chat_id, data.sender_type, data.parent_chat_id, data.parent_name || "", data.parent_class || "", data.parent_phone || "", data.text, getTodayJalali()).run();
    return true;
  } catch { return false; }
}

export async function getMessagesForParentFromD1(env, parentChatId, limit = 20) {
  try {
    const r = await env.DB.prepare("SELECT * FROM messages WHERE parent_chat_id = ? ORDER BY id DESC LIMIT ?").bind(parentChatId, limit).all();
    return (r.results || []).reverse();
  } catch { return []; }
}

export async function getParentsWithMessagesForAdmin(env) {
  try {
    const r = await env.DB.prepare(
      `SELECT parent_chat_id, parent_name, parent_class, parent_phone, COUNT(*) as total, SUM(CASE WHEN is_read = 0 AND sender_type = 'parent' THEN 1 ELSE 0 END) as unread, MAX(created_at) as last_date FROM messages GROUP BY parent_chat_id ORDER BY last_date DESC`
    ).all();
    return r.results || [];
  } catch { return []; }
}

export async function markMessagesAsRead(env, parentChatId) {
  try {
    await env.DB.prepare("UPDATE messages SET is_read = 1, read_at = ? WHERE parent_chat_id = ? AND sender_type = 'parent' AND is_read = 0").bind(getTodayJalali(), parentChatId).run();
  } catch {}
}

export async function countUnreadMessagesForAdmin(env) {
  try {
    const r = await env.DB.prepare("SELECT COUNT(*) as count FROM messages WHERE sender_type = 'parent' AND is_read = 0").first();
    return r?.count || 0;
  } catch { return 0; }
}
