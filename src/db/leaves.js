import { getTodayJalali } from "../lib/jalali.js";

export async function saveLeaveToD1(env, data) {
  try {
    const r = await env.DB.prepare(
      `INSERT INTO leaves (chat_id, student_id, student_name, student_class, from_date, to_date, leave_reason, parent_phone, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'در انتظار', ?)`
    ).bind(data.chat_id, data.student_id || null, data.student_name || "", data.student_class || "", data.from_date || "", data.to_date || "", data.leave_reason || "", data.parent_phone || "", getTodayJalali()).run();
    return r.meta?.last_row_id || null;
  } catch (e) { return null; }
}

export async function getLatestLeavesFromD1(env, n = 10) {
  try {
    const r = await env.DB.prepare("SELECT * FROM leaves ORDER BY id DESC LIMIT ?").bind(n).all();
    return r.results || [];
  } catch { return []; }
}

export async function getUserLeavesFromD1(env, chatId, n = 5) {
  try {
    const r = await env.DB.prepare("SELECT * FROM leaves WHERE chat_id = ? ORDER BY id DESC LIMIT ?").bind(chatId, n).all();
    return r.results || [];
  } catch { return []; }
}

export async function updateLeaveStatusInD1(env, id, status) {
  try {
    await env.DB.prepare("UPDATE leaves SET status = ?, status_date = ? WHERE id = ?").bind(status, getTodayJalali(), id).run();
    return true;
  } catch { return false; }
}

export async function countLeavesInD1(env) {
  try {
    const r = await env.DB.prepare("SELECT COUNT(*) as count FROM leaves").first();
    return r?.count || 0;
  } catch { return 0; }
}
