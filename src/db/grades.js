import { getTodayJalali, getCurrentJalaliMonth } from "../lib/jalali.js";

export async function canRequestGrades(env, studentId) {
  const currentMonth = getCurrentJalaliMonth();
  try {
    const r = await env.DB.prepare(
      `SELECT id, request_date FROM grades WHERE student_id = ? AND request_month = ? AND status IN ('در انتظار', 'تأیید شد') ORDER BY id DESC LIMIT 1`
    ).bind(studentId, currentMonth).first();
    if (r) return { allowed: false, reason: "already_requested", request_date: r.request_date };
    return { allowed: true };
  } catch (e) { return { allowed: true }; }
}

export async function saveGradeRequestToD1(env, data) {
  try {
    const r = await env.DB.prepare(
      `INSERT INTO grades (chat_id, student_id, student_name, student_class, grade_subject, request_date, request_month, parent_phone, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'در انتظار', ?)`
    ).bind(data.chat_id, data.student_id || null, data.student_name || "", data.student_class || "", data.grade_subject || "", getTodayJalali(), getCurrentJalaliMonth(), data.parent_phone || "", getTodayJalali()).run();
    return r.meta?.last_row_id || null;
  } catch (e) { return null; }
}

export async function getLatestGradesFromD1(env, n = 10) {
  try {
    const r = await env.DB.prepare("SELECT * FROM grades ORDER BY id DESC LIMIT ?").bind(n).all();
    return r.results || [];
  } catch { return []; }
}

export async function getUserGradesFromD1(env, chatId, n = 10) {
  try {
    const r = await env.DB.prepare("SELECT * FROM grades WHERE chat_id = ? ORDER BY id DESC LIMIT ?").bind(chatId, n).all();
    return r.results || [];
  } catch { return []; }
}

export async function updateGradeRequestStatus(env, id, status) {
  try {
    await env.DB.prepare("UPDATE grades SET status = ?, status_date = ? WHERE id = ?").bind(status, getTodayJalali(), id).run();
    return true;
  } catch { return false; }
}

export async function getPaidGradeRequests(env) {
  try {
    const r = await env.DB.prepare(
      `SELECT DISTINCT chat_id, student_id, student_name, student_class, request_date FROM grades WHERE status IN ('در انتظار', 'تأیید شد') ORDER BY id DESC LIMIT 50`
    ).all();
    return r.results || [];
  } catch { return []; }
}

export async function saveStudentGrades(env, data) {
  try {
    const existing = await env.DB.prepare("SELECT id FROM student_grades WHERE chat_id = ? AND month = ? AND subject = ?").bind(data.chat_id, data.month, data.subject).first();
    if (existing) {
      await env.DB.prepare(
        `UPDATE student_grades SET g1 = ?, g2 = ?, g3 = ?, g4 = ?, g5 = ?, register_date = ?, registered_by = ?, student_id = ? WHERE id = ?`
      ).bind(data.g1, data.g2, data.g3, data.g4, data.g5, getTodayJalali(), data.registered_by, data.student_id || null, existing.id).run();
      return existing.id;
    } else {
      const r = await env.DB.prepare(
        `INSERT INTO student_grades (chat_id, student_id, student_name, student_class, month, subject, g1, g2, g3, g4, g5, register_date, registered_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(data.chat_id, data.student_id || null, data.student_name || "", data.student_class || "", data.month, data.subject, data.g1, data.g2, data.g3, data.g4, data.g5, getTodayJalali(), data.registered_by).run();
      return r.meta?.last_row_id;
    }
  } catch (e) { return null; }
}

export async function getStudentGradesByMonth(env, chatId, month) {
  try {
    const r = await env.DB.prepare("SELECT * FROM student_grades WHERE chat_id = ? AND month = ? ORDER BY id ASC").bind(chatId, month).all();
    return r.results || [];
  } catch { return []; }
}

export async function getAllStudentGrades(env, chatId) {
  try {
    const r = await env.DB.prepare("SELECT * FROM student_grades WHERE chat_id = ? ORDER BY id DESC").bind(chatId).all();
    return r.results || [];
  } catch { return []; }
}

export async function countGradesInD1(env) {
  try {
    const r = await env.DB.prepare("SELECT COUNT(*) as count FROM grades").first();
    return r?.count || 0;
  } catch { return 0; }
}
