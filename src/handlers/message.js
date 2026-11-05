import { MAIN_MENU, ACADEMIC_MENU, GRADES_MENU, SCHEDULE_LEAVE_MENU, EVENTS_USER_MENU, CONTACT_MENU, PROFILE_MENU, ADMIN_MENU, CANCEL_MENU, STUDENTS_MENU, buildClassKeyboard } from "../keyboards.js";
import { getGreeting, TERMS_TEXT } from "../config.js";
import { escapeMarkdown, escapeCode } from "../lib/strings.js";
import { isAdmin, isUserBlocked, checkRateLimit } from "../core/auth.js";
import { kvGet, kvPut, kvDelete, deleteAllState } from "../core/state.js";
import { sendMessage } from "../core/api.js";
import { getUserAuth, getUserProfile, saveUserProfile, updateUserProfileName, updateUserProfileClass } from "../db/users.js";
import { getActiveStudent, linkUserToStudent } from "../db/students.js";
import { handleStart, handleContact, handlePickStudent } from "../flows/auth.js";
import { startAbsenceFlow, startLeaveFlow, continueForm } from "../flows/academics.js";
import { startDisciplineFlow, handleDisciplineClass, handleDisciplineDescription } from "../flows/discipline.js";

export async function handleUpdate(env, message, ctx) {
  const chatId = message.chat.id;
  const firstName = (message.from && message.from.first_name) || "کاربر";
  const text = message.text ? message.text.trim() : "";
  const admin = isAdmin(env, chatId);

  // ضد اسپم
  if (!admin) {
    const okRate = await checkRateLimit(env, chatId);
    if (!okRate) {
      await sendMessage(env, chatId, "⚠️ تعداد پیام‌ها زیاد است. کمی صبر کنید.");
      return;
    }
  }

  // دستور شروع
  if (text.startsWith("/start")) {
    await handleStart(env, chatId, firstName);
    return;
  }

  // اشتراک شماره
  if (message.contact) {
    await handleContact(env, chatId, message.contact, firstName);
    return;
  }

  // دستورات عمومی
  if (text === "/cancel") {
    await deleteAllState(env, chatId);
    await sendMessage(env, chatId, "❌ لغو شد.", admin ? ADMIN_MENU : MAIN_MENU);
    return;
  }
  if (text === "/admin") {
    if (!admin) return;
    await kvDelete(env, "admin_state_" + chatId);
    await sendMessage(env, chatId, "🎛 *پنل مدیریت*", ADMIN_MENU);
    return;
  }
  if (text === "/terms") { await sendMessage(env, chatId, TERMS_TEXT); return; }

  // چک بلاک
  const blocked = await isUserBlocked(env, chatId);
  if (blocked && !admin) { await sendMessage(env, chatId, "⛔ /start"); return; }

  // وضعیت‌های در حال انتظار (State)
  const pending = await kvGet(env, "pending_" + chatId);
  const adminState = await kvGet(env, "admin_state_" + chatId);

  // اگر در حال انتخاب دانش‌آموز بود
  if (pending === "name") {
    if (text.length < 3) { await sendMessage(env, chatId, "❌ حداقل ۳ حرف:", CANCEL_MENU); return; }
    await saveUserProfile(env, chatId, text, "");
    await kvPut(env, "pending_" + chatId, "class");
    await sendMessage(env, chatId, `✅ نام: *${escapeMarkdown(text)}*\n\n🏫 کلاس:`, buildClassKeyboard());
    return;
  }
  if (pending === "edit_name") {
    if (text.length < 3) { await sendMessage(env, chatId, "❌ حداقل ۳ حرف:", CANCEL_MENU); return; }
    await updateUserProfileName(env, chatId, text);
    await kvDelete(env, "pending_" + chatId);
    await sendMessage(env, chatId, `✅ نام: *${escapeMarkdown(text)}*`, MAIN_MENU);
    return;
  }
  if (pending === "feedback_message" || pending === "message_to_admin") {
    if (text.length < 3) { await sendMessage(env, chatId, "❌ کوتاه:", CANCEL_MENU); return; }
    const profile = await getUserProfile(env, chatId);
    const auth = await getUserAuth(env, chatId);
    const type = pending === "feedback_message" ? "معاون" : "مدیر";
    const header = pending === "feedback_message" ? "📩 *پیام به معاون*" : "💬 *پیام به مدیر*";
    
    await sendMessage(env, env.ADMIN_CHAT_ID, `${header}\n\n👤 ${escapeMarkdown(profile?.name || "—")}\n🏫 ${escapeMarkdown(profile?.className || "—")}\n📱 \`${escapeCode(auth || "—")}\`\n🆔 \`${chatId}\`\n\n📝 ${escapeMarkdown(text)}`);
    await kvDelete(env, "pending_" + chatId);
    await sendMessage(env, chatId, "✅ ارسال شد.", MAIN_MENU);
    return;
  }

  // ========== بخش مدیر ==========
  if (admin) {
    if (adminState === "disc_class") {
      await handleDisciplineClass(env, chatId, text);
      return;
    }
    if (adminState === "disc_description") {
      if (text === "❌ لغو") { await kvDelete(env, "admin_state_" + chatId); await sendMessage(env, chatId, "❌ لغو شد.", ADMIN_MENU); return; }
      await handleDisciplineDescription(env, chatId, text);
      return;
    }

    // دکمه‌های منوی مدیر
    if (text === "📋 ثبت مورد انضباطی") { await startDisciplineFlow(env, chatId); return; }
    if (text === "📝 ثبت غیبت سریع") { await startDisciplineFlow(env, chatId); return; } // فعلاً همون انضباط
    if (text === "👨‍🎓 مدیریت دانش‌آموزان") { await sendMessage(env, chatId, "👨‍🎓 *مدیریت دانش‌آموزان*", STUDENTS_MENU); return; }
    
    // خروج از پنل
    if (text === "🚪 خروج از پنل مدیر" || text === "🔙 بازگشت") {
      await kvDelete(env, "admin_state_" + chatId);
      await sendMessage(env, chatId, "🏠 منوی اصلی", MAIN_MENU);
      return;
    }
    if (text === "📊 داشبورد") {
      const stats = await Promise.all([
        env.DB.prepare("SELECT COUNT(*) as c FROM users WHERE blocked=0 OR blocked IS NULL").first(),
        env.DB.prepare("SELECT COUNT(*) as c FROM absences").first(),
        env.DB.prepare("SELECT COUNT(*) as c FROM discipline_records").first()
      ]);
      await sendMessage(env, chatId, `📊 *داشبورد*\n\n👥 اولیا: *${stats[0]?.c || 0}*\n📝 غیبت: *${stats[1]?.c || 0}*\n📋 انضباط: *${stats[2]?.c || 0}*`, ADMIN_MENU);
      return;
    }
    if (text === "💬 پیام‌های اولیا") {
      const unread = await env.DB.prepare("SELECT COUNT(*) as c FROM messages WHERE is_read=0 AND sender_type='parent'").first();
      await sendMessage(env, chatId, `💬 پیام‌های خوانده‌نشده: *${unread?.c || 0}*`, ADMIN_MENU);
      return;
    }
    // بقیه دکمه‌های مدیر رو می‌تونیم بعداً اضافه کنیم
  }

  // ========== بخش کاربر عادی (اولیا) ==========
  if (text === "📝 ثبت غیبت") { await startAbsenceFlow(env, chatId); return; }
  if (text === "📅 درخواست مرخصی") { await startLeaveFlow(env, chatId); return; }
  if (text === "📝 خدمات آموزشی") { await sendMessage(env, chatId, "📝 *خدمات آموزشی*", ACADEMIC_MENU); return; }
  if (text === "📊 نمرات و کارنامه") { await sendMessage(env, chatId, "📊 *نمرات*", GRADES_MENU); return; }
  if (text === "📅 برنامه و مرخصی") { await sendMessage(env, chatId, "📅 *برنامه*", SCHEDULE_LEAVE_MENU); return; }
  if (text === "🎫 رویدادها و ثبت‌نام") { await sendMessage(env, chatId, "🎫 *رویدادها*", EVENTS_USER_MENU); return; }
  if (text === "💬 ارتباط با مدرسه") { await sendMessage(env, chatId, "💬 *ارتباط*", CONTACT_MENU); return; }
  if (text === "👤 پروفایل من") {
    const profile = await getUserProfile(env, chatId);
    await sendMessage(env, chatId, `👤 *پروفایل*\n\n📛 ${escapeMarkdown(profile?.name || "—")}\n🎓 ${escapeMarkdown(profile?.className || "—")}`, PROFILE_MENU);
    return;
  }
  if (text === "📩 پیام به معاون") { await kvPut(env, "pending_" + chatId, "feedback_message"); await sendMessage(env, chatId, "📩 پیام خود را بنویسید:", CANCEL_MENU); return; }
  if (text === "💬 پیام به مدیر") { await kvPut(env, "pending_" + chatId, "message_to_admin"); await sendMessage(env, chatId, "💬 پیام خود را بنویسید:", CANCEL_MENU); return; }
  if (text === "🔙 بازگشت") { await sendMessage(env, chatId, "🏠 *منوی اصلی*", MAIN_MENU); return; }

  // ادامه فرم‌ها (اگر در حال پر کردن فرم بود)
  const formJson = await kvGet(env, "form_" + chatId);
  if (formJson) {
    const form = JSON.parse(formJson);
    if (form.type === "absence") form.absence_reason = text;
    else if (form.type === "leave") {
      if (!form.from_date) { form.from_date = text; } // نباید اینجا بیاد، ولی محض احتیاط
      else if (!form.to_date) { form.to_date = text; }
      else if (!form.leave_reason) { form.leave_reason = text; }
    }
    await kvPut(env, "form_" + chatId, JSON.stringify(form));
    await continueForm(env, chatId, form);
    return;
  }

  // پیام ناشناخته
  await sendMessage(env, chatId, "متوجه نشدم. لطفاً از منو انتخاب کنید.", admin ? ADMIN_MENU : MAIN_MENU);
}
