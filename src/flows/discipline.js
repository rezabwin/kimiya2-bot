import { DISCIPLINE_CATEGORIES, CLASSES } from "../config.js";
import { getTodayJalali } from "../lib/jalali.js";
import { escapeMarkdown } from "../lib/strings.js";
import { getStudentsByClass } from "../db/students.js";
import { saveDisciplineRecord } from "../db/discipline.js";
import { kvPut, kvDelete, kvGet } from "../core/state.js";
import { sendMessage, editMessageText, editMessageReplyMarkup, answerCallback } from "../core/api.js";
import { ADMIN_MENU, CANCEL_MENU } from "../keyboards.js";

// مرحله ۱: مدیر می‌خواد ثبت انضباطی کنه
export async function startDisciplineFlow(env, chatId) {
  await kvPut(env, "admin_state_" + chatId, "disc_class");
  await sendMessage(
    env,
    chatId,
    "📋 *ثبت مورد انضباطی*\n\n🏫 لطفاً کلاس را انتخاب کنید (یا شماره آن را بفرستید):\n\n" +
      CLASSES.map((c, i) => `${i + 1}. ${c}`).join("\n"),
    CANCEL_MENU
  );
}

// مرحله ۲: انتخاب کلاس
export async function handleDisciplineClass(env, chatId, text) {
  let cls = null;
  const n = parseInt(text);
  if (!isNaN(n) && n >= 1 && n <= CLASSES.length) cls = CLASSES[n - 1];
  else if (CLASSES.includes(text)) cls = text;

  if (!cls) {
    await sendMessage(env, chatId, "❌ کلاس نامعتبر است. لطفاً از لیست انتخاب کنید.", CANCEL_MENU);
    return;
  }

  const students = await getStudentsByClass(env, cls);
  if (students.length === 0) {
    await sendMessage(env, chatId, "📭 دانش‌آموزی در این کلاس ثبت نشده است.", ADMIN_MENU);
    return;
  }

  // ذخیره کلاس و لیست دانش‌آموزان در Temp
  await kvPut(env, "discipline_temp_" + chatId, JSON.stringify({
    class: cls,
    selected: [],
    record_date: getTodayJalali(),
  }));

  // نمایش دکمه‌های شیشه‌ای برای انتخاب چندگانه
  const rows = students.map((s) => [
    { text: `⬜ ${s.full_name}`, callback_data: `disc_pick_${s.id}` }
  ]);
  rows.push([{ text: "➡️ ادامه (0 نفر)", callback_data: "disc_go" }]);

  await sendMessage(
    env,
    chatId,
    `📋 *${cls}*\n\nلطفاً دانش‌آموزان مورد نظر را انتخاب کنید (می‌توانید چند نفر را بزنید):`,
    { inline_keyboard: rows }
  );
}

// مرحله ۳: انتخاب/لغو انتخاب دانش‌آموز
export async function handleDisciplinePick(env, chatId, messageId, studentId, cbId) {
  const tStr = await kvGet(env, "discipline_temp_" + chatId);
  if (!tStr) { await answerCallback(env, cbId, "❌"); return; }
  const temp = JSON.parse(tStr);

  if (!temp.selected.includes(studentId)) temp.selected.push(studentId);
  else temp.selected = temp.selected.filter((x) => x !== studentId); // Toggle

  await kvPut(env, "discipline_temp_" + chatId, JSON.stringify(temp));
  await answerCallback(env, cbId, `✅ ${temp.selected.length} نفر`);

  // آپدیت کیبورد
  const students = await getStudentsByClass(env, temp.class);
  const rows = students.map((s) => [
    { text: (temp.selected.includes(s.id) ? "✅ " : "⬜ ") + s.full_name, callback_data: `disc_pick_${s.id}` }
  ]);
  rows.push([{ text: `➡️ ادامه (${temp.selected.length} نفر)`, callback_data: "disc_go" }]);

  await editMessageReplyMarkup(env, chatId, messageId, { inline_keyboard: rows });
}

// مرحله ۴: رفتن به مرحله بعد (انتخاب نوع تخلف)
export async function handleDisciplineGo(env, chatId, messageId, cbId) {
  const tStr = await kvGet(env, "discipline_temp_" + chatId);
  if (!tStr) { await answerCallback(env, cbId, "❌"); return; }
  const temp = JSON.parse(tStr);
  if (temp.selected.length === 0) {
    await answerCallback(env, cbId, "❌ حداقل یک نفر را انتخاب کنید");
    return;
  }

  await editMessageReplyMarkup(env, chatId, messageId, null);
  await answerCallback(env, cbId, "✅");

  const catRows = DISCIPLINE_CATEGORIES.map((c) => [
    { text: c, callback_data: `disc_cat_${encodeURIComponent(c)}` }
  ]);
  catRows.push([{ text: "❌ لغو", callback_data: "disc_cancel" }]);

  await sendMessage(
    env,
    chatId,
    "📋 *نوع مورد را انتخاب کنید:*",
    { inline_keyboard: catRows }
  );
}

// مرحله ۵: انتخاب نوع تخلف
export async function handleDisciplineCategory(env, chatId, messageId, category, cbId) {
  const tStr = await kvGet(env, "discipline_temp_" + chatId);
  if (!tStr) { await answerCallback(env, cbId, "❌"); return; }
  const temp = JSON.parse(tStr);
  temp.category = category;
  await kvPut(env, "discipline_temp_" + chatId, JSON.stringify(temp));

  await editMessageText(env, chatId, messageId, `✅ نوع: *${escapeMarkdown(category)}*`);
  await kvPut(env, "admin_state_" + chatId, "disc_description");
  await answerCallback(env, cbId, "✅");

  await sendMessage(env, chatId, "📝 لطفاً توضیحات را بنویسید (یا /skip برای خالی):\n\n❌ /cancel", CANCEL_MENU);
}

// مرحله ۶: دریافت توضیحات و ذخیره نهایی
export async function handleDisciplineDescription(env, chatId, text) {
  const tStr = await kvGet(env, "discipline_temp_" + chatId);
  if (!tStr) return;
  const temp = JSON.parse(tStr);
  const desc = text === "/skip" ? "" : text;

  const results = { sent: 0, failed: 0, noParent: 0 };

  // گرفتن اطلاعات همه دانش‌آموزان انتخاب شده
  const placeholders = temp.selected.map(() => "?").join(",");
  const students = (await env.DB.prepare(`SELECT * FROM students WHERE id IN (${placeholders})`).bind(...temp.selected).all()).results || [];

  // گرفتن chat_id اولیا
  const phones = students.map((s) => s.parent_phone).filter(Boolean);
  const parentsMap = {};
  if (phones.length > 0) {
    const pPlaceholders = phones.map(() => "?").join(",");
    const parentResults = (await env.DB.prepare(`SELECT chat_id, phone, blocked FROM users WHERE phone IN (${pPlaceholders})`).bind(...phones).all()).results || [];
    for (const p of parentResults) {
      parentsMap[p.phone] = p;
    }
  }

  // ذخیره رکوردها به صورت Batch برای سرعت بالا
  const insertStmts = students.map((stu) =>
    env.DB.prepare(
      `INSERT INTO discipline_records (student_id, student_name, class_name, category, description, record_date, registered_by, parent_phone, notify_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`
    ).bind(stu.id, stu.full_name, stu.class_name, temp.category, desc, temp.record_date, chatId, stu.parent_phone, getTodayJalali())
  );
  
  if (insertStmts.length > 0) {
    await env.DB.batch(insertStmts);
  }

  // ارسال پیام به اولیا
  for (const stu of students) {
    const parent = parentsMap[stu.parent_phone];
    if (!parent) {
      results.noParent++;
      continue;
    }
    if (parent.blocked === 1) {
      results.failed++;
      continue;
    }

    const notifyText =
      `⚠️ *اطلاعیه مدرسه*\n\n` +
      `👤 دانش‌آموز: *${escapeMarkdown(stu.full_name)}*\n` +
      `🏫 کلاس: ${escapeMarkdown(stu.class_name)}\n` +
      `📋 نوع: *${escapeMarkdown(temp.category)}*\n` +
      `📅 تاریخ: ${temp.record_date}\n` +
      (desc ? `📝 توضیح: ${escapeMarkdown(desc)}\n` : "") +
      `\n_دبیرستان شهید کیمیایی ۲_`;

    const r = await sendMessage(env, parent.chat_id, notifyText);
    if (r.ok) results.sent++;
    else results.failed++;
  }

  // پاکسازی
  await kvDelete(env, "discipline_temp_" + chatId);
  await kvDelete(env, "admin_state_" + chatId);

  let report = `✅ *ثبت شد*\n\n📋 ${escapeMarkdown(temp.category)}\n📅 تاریخ: ${temp.record_date}\n👥 مجموع: ${students.length}\n\n`;
  report += `📤 ارسال موفق: ${results.sent}\n`;
  if (results.noParent > 0) report += `🟡 ولی ثبت‌نام نکرده: ${results.noParent}\n`;
  if (results.failed > 0) report += `🔴 خطا/بلاک: ${results.failed}\n`;

  await sendMessage(env, chatId, report, ADMIN_MENU);
}
