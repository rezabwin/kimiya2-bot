import { getTodayJalali } from "../lib/jalali.js";
import { normalizePhone } from "../lib/validators.js";

export async function findStudentsByPhone(env, phone) {
  try {
    const r = await env.DB.prepare("SELECT * FROM students WHERE parent_phone = ? AND active = 1 ORDER BY full_name ASC").bind(normalizePhone(phone)).all();
    return r.results || [];
  } catch { return []; }
}

export async function findStudentById(env, studentId) {
  try { return await env.DB.prepare("SELECT * FROM students WHERE id = ?").bind(studentId).first(); } catch { return null; }
}

export async function getStudentsByClass(env, className) {
  try {
    const r = await env.DB.prepare("SELECT * FROM students WHERE class_name = ? AND active = 1 ORDER BY full_name ASC").bind(className).all();
    return r.results || [];
  } catch { return []; }
}

export async function addStudentToD1(env, data) {
  try {
    const existing = await env.DB.prepare("SELECT id FROM students WHERE full_name = ? AND class_name = ?").bind(data.full_name, data.class_name).first();
    if (existing) {
      await env.DB.prepare(`UPDATE students SET parent_phone = ?, parent_name = ?, student_code = ?, active = 1, updated_at = ? WHERE id = ?`).bind(normalizePhone(data.parent_phone), data.parent_name || "", data.student_code || "", getTodayJalali(), existing.id).run();
      return { id: existing.id, updated: true };
    }
    const r = await env.DB.prepare(`INSERT INTO students (student_code, full_name, class_name, parent_phone, parent_name, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)`).bind(data.student_code || "", data.full_name, data.class_name, normalizePhone(data.parent_phone), data.parent_name || "", getTodayJalali(), getTodayJalali()).run();
    return { id: r.meta?.last_row_id, created: true };
  } catch (e) { return { error: e.message }; }
}

export async function deactivateStudent(env, studentId) {
  try { await env.DB.prepare("UPDATE students SET active = 0, updated_at = ? WHERE id = ?").bind(getTodayJalali(), studentId).run(); return true; } catch { return false; }
}

export async function countStudentsInD1(env) {
  try {
    const r = await env.DB.prepare("SELECT COUNT(*) as count FROM students WHERE active = 1").first();
    return r?.count || 0;
  } catch { return 0; }
}

export async function linkUserToStudent(env, chatId, studentId) {
  try {
    const existing = await env.DB.prepare("SELECT * FROM user_students WHERE chat_id = ? AND student_id = ?").bind(chatId, studentId).first();
    if (existing) return { linked: false, existed: true };

    const count = await env.DB.prepare("SELECT COUNT(*) as c FROM user_students WHERE chat_id = ?").bind(chatId).first();
    const isFirst = (count?.c || 0) === 0;

    await env.DB.prepare("INSERT INTO user_students (chat_id, student_id, is_active, linked_at) VALUES (?, ?, ?, ?)").bind(chatId, studentId, isFirst ? 1 : 0, getTodayJalali()).run();

    if (isFirst) {
      await env.DB.prepare(`INSERT INTO user_states (chat_id, active_student_id, updated_at) VALUES (?, ?, ?) ON CONFLICT(chat_id) DO UPDATE SET active_student_id = excluded.active_student_id`).bind(chatId, studentId, getTodayJalali()).run();
    }
    return { linked: true, isFirst };
  } catch (e) { return { error: e.message }; }
}

export async function getUserLinkedStudents(env, chatId) {
  try {
    const r = await env.DB.prepare(`SELECT s.*, us.is_active, us.linked_at FROM user_students us JOIN students s ON s.id = us.student_id WHERE us.chat_id = ? AND s.active = 1 ORDER BY s.full_name ASC`).bind(chatId).all();
    return r.results || [];
  } catch { return []; }
}

export async function getActiveStudent(env, chatId) {
  try {
    const stateRow = await env.DB.prepare("SELECT active_student_id FROM user_states WHERE chat_id = ?").bind(chatId).first();
    if (stateRow?.active_student_id) {
      const s = await findStudentById(env, stateRow.active_student_id);
      if (s) return s;
    }
    const r = await env.DB.prepare(`SELECT s.* FROM user_students us JOIN students s ON s.id = us.student_id WHERE us.chat_id = ? AND s.active = 1 ORDER BY us.linked_at ASC LIMIT 1`).bind(chatId).first();
    return r || null;
  } catch { return null; }
}

export async function searchStudentsInD1(env, query, limit = 20) {
  const q = `%${query}%`;
  try {
    const r = await env.DB.prepare(`SELECT * FROM students WHERE (full_name LIKE ? OR parent_phone LIKE ? OR class_name LIKE ?) AND active = 1 ORDER BY class_name, full_name LIMIT ?`).bind(q, q, q, limit).all();
    return r.results || [];
  } catch { return []; }
}
