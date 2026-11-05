import { getTodayJalali, toJalali } from "../lib/jalali.js";

export async function getEventsListFromD1(env) {
  try {
    const r = await env.DB.prepare("SELECT * FROM events WHERE active = 1 ORDER BY id DESC").all();
    return r.results || [];
  } catch { return []; }
}

export async function getEventFromD1(env, id) {
  try { return await env.DB.prepare("SELECT * FROM events WHERE id = ?").bind(id).first(); } catch { return null; }
}

export async function saveEventToD1(env, data) {
  try {
    await env.DB.prepare(
      `INSERT INTO events (id, title, description, event_date, deadline, capacity, active, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`
    ).bind(data.id, data.title || "", data.description || "", data.event_date || "", data.deadline || "", data.capacity || 0, getTodayJalali(), data.created_by || 0).run();
    return true;
  } catch (e) { return false; }
}

export async function deleteEventFromD1(env, id) {
  try {
    await env.DB.prepare("DELETE FROM events WHERE id = ?").bind(id).run();
    await env.DB.prepare("DELETE FROM registrations WHERE event_id = ?").bind(id).run();
    return true;
  } catch { return false; }
}

export async function countEventRegsInD1(env, eventId) {
  try {
    const r = await env.DB.prepare("SELECT COUNT(*) as count FROM registrations WHERE event_id = ?").bind(eventId).first();
    return r?.count || 0;
  } catch { return 0; }
}

export async function hasUserRegisteredInD1(env, eventId, chatId) {
  try {
    const r = await env.DB.prepare("SELECT COUNT(*) as count FROM registrations WHERE event_id = ? AND chat_id = ?").bind(eventId, chatId).first();
    return (r?.count || 0) > 0;
  } catch { return false; }
}

export async function saveRegistrationToD1(env, data) {
  try {
    const r = await env.DB.prepare(
      `INSERT INTO registrations (event_id, chat_id, student_id, student_name, student_class, notes, parent_phone, reg_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(data.event_id, data.chat_id, data.student_id || null, data.student_name || "", data.student_class || "", data.notes || "ندارد", data.parent_phone || "", getTodayJalali()).run();
    return r.meta?.last_row_id || null;
  } catch { return null; }
}

export async function getEventRegistrationsFromD1(env, eventId) {
  try {
    const r = await env.DB.prepare("SELECT * FROM registrations WHERE event_id = ? ORDER BY id ASC").bind(eventId).all();
    return r.results || [];
  } catch { return []; }
}

export async function deleteRegistrationFromD1(env, regId) {
  try {
    await env.DB.prepare("DELETE FROM registrations WHERE id = ?").bind(regId).run();
    return true;
  } catch { return false; }
}

export async function getRegistrationStatsByClass(env, eventId) {
  try {
    const r = await env.DB.prepare(`SELECT student_class, COUNT(*) as count FROM registrations WHERE event_id = ? GROUP BY student_class ORDER BY count DESC`).bind(eventId).all();
    return r.results || [];
  } catch { return []; }
}

export async function getEventsWithDeadlineTomorrow(env) {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const j = toJalali(tomorrow.getFullYear(), tomorrow.getMonth() + 1, tomorrow.getDate());
    const tomorrowStr = `${j[0]}/${String(j[1]).padStart(2, "0")}/${String(j[2]).padStart(2, "0")}`;
    const r = await env.DB.prepare("SELECT * FROM events WHERE active = 1 AND deadline = ?").bind(tomorrowStr).all();
    return r.results || [];
  } catch { return []; }
}

export async function hasReminderBeenSent(env, eventId, chatId) {
  try {
    const r = await env.DB.prepare("SELECT COUNT(*) as count FROM reminders_sent WHERE event_id = ? AND chat_id = ?").bind(eventId, chatId).first();
    return (r?.count || 0) > 0;
  } catch { return false; }
}

export async function markReminderSent(env, eventId, chatId) {
  try {
    await env.DB.prepare("INSERT OR IGNORE INTO reminders_sent (event_id, chat_id, sent_date) VALUES (?, ?, ?)").bind(eventId, chatId, getTodayJalali()).run();
  } catch {}
}
