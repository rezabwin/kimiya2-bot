import { getTodayJalali } from "../lib/jalali.js";

export async function saveAbsenceToD1(env, data) {
  try {
    const r = await env.DB.prepare(
      `INSERT INTO absences (chat_id, student_id, student_name, student_class, absence_date, absence_reason, parent_phone, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'در انتظار', ?)`
    ).bind(data.chat_id, data.student_id || null, data.student_name || "", data.student_class || "", data.absence_date || getTodayJalali(), data.absence_reason || "", data.parent_phone || "", getTodayJalali()).run();
    return r.meta?.last_row_id || null;
  } catch (e) { return null; }
}

export async function getLatestAbsencesFromD1(env, n = 10) {
  try {
    const r = await env.DB.prepare("SELECT * FROM absences ORDER BY id DESC LIMIT ?").bind(n).all();
    return r.results || [];
  } catch { return []; }
}

export async function getUserAbsencesFromD1(env, chatId, n = 5) {
  try {
    const r = await env.DB.prepare("SELECT * FROM absences WHERE chat_id = ? ORDER BY id DESC LIMIT ?").bind(chatId, n).all();
    return r.results || [];
  } catch { return []; }
}

export async function getStudentAbsences(env, studentId, n = 20) {
  try {
    const r = await env.DB.prepare("SELECT * FROM absences WHERE student_id = ? ORDER BY id DESC LIMIT ?").bind(studentId, n).all();
    return r.results || [];
  } catch { return []; }
}

export async function updateAbsenceStatusInD1(env, id, status) {
  try {
    await env.DB.prepare("UPDATE absences SET status = ?, status_date = ? WHERE id = ?").bind(status, getTodayJalali(), id).run();
    return true;
  } catch { return false; }
}

export async function countAbsencesInD1(env) {
  try {
    const r = await env.DB.prepare("SELECT COUNT(*) as count FROM absences").first();
    return r?.count || 0;
  } catch { return 0; }
}
