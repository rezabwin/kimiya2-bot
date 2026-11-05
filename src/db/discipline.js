import { getTodayJalali } from "../lib/jalali.js";

export async function saveDisciplineRecord(env, data) {
  try {
    const r = await env.DB.prepare(`INSERT INTO discipline_records (student_id, student_name, class_name, category, severity, description, record_date, registered_by, parent_phone, notify_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`).bind(data.student_id, data.student_name || "", data.class_name || "", data.category, data.severity || "عادی", data.description || "", data.record_date || getTodayJalali(), data.registered_by || 0, data.parent_phone || "", getTodayJalali()).run();
    return r.meta?.last_row_id || null;
  } catch (e) { return null; }
}

export async function updateDisciplineNotifyStatus(env, recordId, status) {
  try { await env.DB.prepare("UPDATE discipline_records SET notify_status = ?, notified_at = ? WHERE id = ?").bind(status, getTodayJalali(), recordId).run(); return true; } catch { return false; }
}

export async function getStudentDisciplineRecords(env, studentId, limit = 20) {
  try {
    const r = await env.DB.prepare("SELECT * FROM discipline_records WHERE student_id = ? ORDER BY id DESC LIMIT ?").bind(studentId, limit).all();
    return r.results || [];
  } catch { return []; }
}

export async function getRecentDisciplineRecords(env, limit = 20) {
  try {
    const r = await env.DB.prepare("SELECT * FROM discipline_records ORDER BY id DESC LIMIT ?").bind(limit).all();
    return r.results || [];
  } catch { return []; }
}
