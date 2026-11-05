import { getTodayJalali } from "../lib/jalali.js";
import { escapeMarkdown, escapeCode } from "../lib/strings.js";
import { saveAbsenceToD1, saveLeaveToD1 } from "../db/absences.js";
import { getActiveStudent } from "../db/students.js";
import { kvPut, kvDelete, kvGet } from "../core/state.js";
import { sendMessage, editMessageText, answerCallback } from "../core/api.js";
import { buildCalendarKeyboard, CANCEL_MENU, MAIN_MENU } from "../keyboards.js";
import { getTodayJalaliParts } from "../lib/jalali.js";

// شروع فرم غیبت
export async function startAbsenceFlow(env, chatId) {
  const student = await getActiveStudent(env, chatId);
  if (!student) {
    await sendMessage(env, chatId, "❌ دانش‌آموزی متصل نیست. لطفاً /start کنید.", MAIN_MENU);
    return;
  }

  await kvPut(env, "form_" + chatId, JSON.stringify({
    type: "absence",
    chat_id: chatId,
    student_id: student.id,
    student_name: student.full_name,
    student_class: student.class_name,
    parent_phone: student.parent_phone,
  }));

  await sendMessage(
    env,
    chatId,
    `📝 *ثبت غیبت*\n\n👤 ${escapeMarkdown(student.full_name)}\n🏫 ${escapeMarkdown(student.class_name)}\n\nتأیید می‌کنید؟`,
    {
      inline_keyboard: [
        [{ text: "✅ تأیید و ادامه", callback_data: "confirm_absence" }],
        [{ text: "❌ لغو", callback_data: "cancelform_absence" }],
      ],
    }
  );
}

// شروع فرم مرخصی
export async function startLeaveFlow(env, chatId) {
  const student = await getActiveStudent(env, chatId);
  if (!student) {
    await sendMessage(env, chatId, "❌ دانش‌آموزی متصل نیست. لطفاً /start کنید.", MAIN_MENU);
    return;
  }

  await kvPut(env, "form_" + chatId, JSON.stringify({
    type: "leave",
    chat_id: chatId,
    student_id: student.id,
    student_name: student.full_name,
    student_class: student.class_name,
    parent_phone: student.parent_phone,
  }));

  await sendMessage(
    env,
    chatId,
    `📅 *درخواست مرخصی*\n\n👤 ${escapeMarkdown(student.full_name)}\n🏫 ${escapeMarkdown(student.class_name)}\n\nتأیید می‌کنید؟`,
    {
      inline_keyboard: [
        [{ text: "✅ تأیید و ادامه", callback_data: "confirm_leave" }],
        [{ text: "❌ لغو", callback_data: "cancelform_leave" }],
      ],
    }
  );
}

// ادامه فرم (بعد از تأیید)
export async function continueForm(env, chatId, form) {
  if (form.type === "absence") {
    // فرم غیبت فقط دلیل می‌خواد (تاریخ خودکار امروز)
    if (!form.absence_reason) {
      await sendMessage(env, chatId, "📝 لطفاً دلیل غیبت را بنویسید:\n\n❌ /cancel", CANCEL_MENU);
      return;
    }
    // ثبت نهایی
    form.absence_date = getTodayJalali();
    const id = await saveAbsenceToD1(env, form);
    if (!id) {
      await sendMessage(env, chatId, "❌ خطا در ثبت. لطفاً دوباره تلاش کنید.", MAIN_MENU);
      return;
    }
    await kvDelete(env, "form_" + chatId);
    
    await sendMessage(
      env,
      chatId,
      `✅ *غیبت ثبت شد*\n\n👤 ${escapeMarkdown(form.student_name)}\n📅 ${form.absence_date}\n📝 ${escapeMarkdown(form.absence_reason)}\n\n⏳ در انتظار تأیید مدیر.`,
      MAIN_MENU
    );

    // اطلاع به مدیر
    await sendMessage(
      env,
      env.ADMIN_CHAT_ID,
      `🔔 *غیبت جدید*\n\n👤 ${escapeMarkdown(form.student_name)}\n🏫 ${escapeMarkdown(form.student_class)}\n📅 ${form.absence_date}\n📝 ${escapeMarkdown(form.absence_reason)}\n📱 \`${escapeCode(form.parent_phone)}\``,
      {
        inline_keyboard: [
          [
            { text: "✅ تأیید", callback_data: `approve|absence_${chatId}_${id}|${chatId}` },
            { text: "❌ رد", callback_data: `reject|absence_${chatId}_${id}|${chatId}` },
          ],
        ],
      }
    );
  } 
  else if (form.type === "leave") {
    // فرم مرخصی: تاریخ شروع، تاریخ پایان، دلیل
    if (!form.from_date) {
      await kvPut(env, "cal_field_" + chatId, "from_date");
      const j = getTodayJalaliParts();
      await sendMessage(env, chatId, "📅 تاریخ شروع مرخصی:", buildCalendarKeyboard(j[0], j[1], "cal"));
      return;
    }
    if (!form.to_date) {
      await kvPut(env, "cal_field_" + chatId, "to_date");
      const j = getTodayJalaliParts();
      await sendMessage(env, chatId, "📅 تاریخ پایان مرخصی:", buildCalendarKeyboard(j[0], j[1], "cal"));
      return;
    }
    if (!form.leave_reason) {
      await sendMessage(env, chatId, "📝 لطفاً دلیل مرخصی را بنویسید:\n\n❌ /cancel", CANCEL_MENU);
      return;
    }
    // ثبت نهایی
    const id = await saveLeaveToD1(env, form);
    if (!id) {
      await sendMessage(env, chatId, "❌ خطا در ثبت. لطفاً دوباره تلاش کنید.", MAIN_MENU);
      return;
    }
    await kvDelete(env, "form_" + chatId);
    await kvDelete(env, "cal_field_" + chatId);

    await sendMessage(
      env,
      chatId,
      `✅ *مرخصی ثبت شد*\n\n👤 ${escapeMarkdown(form.student_name)}\n📅 از ${form.from_date} تا ${form.to_date}\n📝 ${escapeMarkdown(form.leave_reason)}\n\n⏳ در انتظار تأیید مدیر.`,
      MAIN_MENU
    );

    // اطلاع به مدیر
    await sendMessage(
      env,
      env.ADMIN_CHAT_ID,
      `🔔 *درخواست مرخصی*\n\n👤 ${escapeMarkdown(form.student_name)}\n🏫 ${escapeMarkdown(form.student_class)}\n📅 از ${form.from_date} تا ${form.to_date}\n📝 ${escapeMarkdown(form.leave_reason)}\n📱 \`${escapeCode(form.parent_phone)}\``,
      {
        inline_keyboard: [
          [
            { text: "✅ تأیید", callback_data: `approve|leave_${chatId}_${id}|${chatId}` },
            { text: "❌ رد", callback_data: `reject|leave_${chatId}_${id}|${chatId}` },
          ],
        ],
      }
    );
  }
}

// هندل کردن دکمه‌های inline فرم
export async function handleFormCallback(env, chatId, messageId, data, cbId) {
  if (data === "confirm_absence" || data === "confirm_leave") {
    const formStr = await kvGet(env, "form_" + chatId);
    if (!formStr) {
      await answerCallback(env, cbId, "❌ خطا");
      return;
    }
    const form = JSON.parse(formStr);
    await editMessageText(env, chatId, messageId, "✅ تأیید شد. لطفاً ادامه دهید...");
    await answerCallback(env, cbId, "✅");
    await continueForm(env, chatId, form);
    return true;
  }
  if (data === "cancelform_absence" || data === "cancelform_leave") {
    await kvDelete(env, "form_" + chatId);
    await kvDelete(env, "cal_field_" + chatId);
    await editMessageText(env, chatId, messageId, "❌ لغو شد.");
    await sendMessage(env, chatId, "❌ لغو شد.", MAIN_MENU);
    await answerCallback(env, cbId, "لغو");
    return true;
  }
  return false;
}
