import { TERMS_TEXT, MAIN_MENU } from "../config.js";
import { SHARE_PHONE_MENU, CANCEL_MENU, buildClassKeyboard } from "../keyboards.js";
import { getGreeting } from "../config.js";
import { normalizePhone, validatePhone } from "../lib/validators.js";
import { escapeMarkdown, escapeCode } from "../lib/strings.js";
import { isAdmin, isPhoneAllowed } from "../core/auth.js";
import { saveUserAuth, getUserProfile, saveUserToD1 } from "../db/users.js";
import { findStudentsByPhone, linkUserToStudent } from "../db/students.js";
import { kvPut, kvDelete } from "../core/state.js";
import { sendMessage, editMessageText, answerCallback, sendLongMessage } from "../core/api.js";

// این تابع وقتی /start زده می‌شه صدا زده می‌شه
export async function handleStart(env, chatId, firstName) {
  await kvDelete(env, "pending_" + chatId);
  const admin = isAdmin(env, chatId);
  
  // گرفتن پروفایل کاربر (اگر قبلاً ثبت‌نام کرده)
  const profile = await getUserProfile(env, chatId);
  const auth = await env.DB.prepare("SELECT phone FROM users WHERE chat_id = ?").bind(chatId).first();
  const hasAuth = auth && auth.phone;

  if ((hasAuth && profile && profile.name && profile.className) || admin) {
    const greeting = getGreeting();
    await sendMessage(
      env,
      chatId,
      greeting + " " + escapeMarkdown(firstName) + " عزیز 🌸\n" +
        (admin ? "پنل مدیریت: /admin\n\n" : "") +
        "🏫 دبیرستان شهید کیمیایی ۲\n\n" +
        "لطفاً یک گزینه از منوی زیر انتخاب کنید:",
      MAIN_MENU
    );
  } else {
    // اگر ثبت‌نام نکرده بود، شرایط رو نشون بده و شماره بخواه
    await kvPut(env, "pending_" + chatId, "phone");
    await sendMessage(
      env,
      chatId,
      "سلام " + escapeMarkdown(firstName) + " عزیز 🌸\n\n" +
        TERMS_TEXT + "\n\n" +
        "🔐 *احراز هویت*\n\n" +
        "برای ادامه، لطفاً روی دکمه زیر کلیک کنید تا شماره موبایل شما تأیید شود.\n\n" +
        "❌ /cancel",
      SHARE_PHONE_MENU
    );
  }
}

// وقتی کاربر شماره‌ش رو به اشتراک می‌ذاره
export async function handleContact(env, chatId, contact, firstName) {
  // چک می‌کنیم شماره مال خود کاربر باشه (نه فوروارد شده)
  if (contact.user_id !== chatId) {
    await sendMessage(env, chatId, "❌ فقط شماره خودتان را ارسال کنید.", SHARE_PHONE_MENU);
    return;
  }

  const normalized = normalizePhone(contact.phone_number || "");
  if (!validatePhone(normalized)) {
    await sendMessage(env, chatId, "⚠️ شماره نامعتبر است.", SHARE_PHONE_MENU);
    return;
  }

  // چک می‌کنیم شماره در لیست مجاز باشه
  const allowed = await isPhoneAllowed(env, normalized);
  if (!allowed) {
    await sendMessage(
      env,
      chatId,
      "⛔ *شماره مجاز نیست*\n\n" +
        "📱 `" + escapeCode(normalized) + "`\n\n" +
        "به معاونت *آقای ولی‌پور* مراجعه کنید."
    );
    return;
  }

  await saveUserAuth(env, chatId, normalized, firstName);

  // چک می‌کنیم این شماره در لیست دانش‌آموزان هست یا نه
  const linkedStudents = await findStudentsByPhone(env, normalized);

  if (linkedStudents.length > 0) {
    // اگر هست، ازش می‌خوایم دانش‌آموزش رو انتخاب کنه
    await kvPut(env, "pending_" + chatId, "select_student");
    await kvPut(env, "student_temp_" + chatId, JSON.stringify(linkedStudents));

    const rows = linkedStudents.map((s) => [
      { text: `${s.full_name} — ${s.class_name}`, callback_data: `pickstu_${s.id}` },
    ]);
    
    await sendMessage(
      env,
      chatId,
      "✅ *شماره تأیید شد*\n\n👨‍🎓 لطفاً دانش‌آموز خود را انتخاب کنید:",
      { inline_keyboard: rows }
    );
    return;
  }

  // اگر شماره مجاز بود ولی دانش‌آموز پیدا نشد، می‌ره برای ثبت‌نام دستی
  await kvPut(env, "pending_" + chatId, "name");
  await sendMessage(
    env,
    chatId,
    "✅ *شماره تأیید شد*\n\n" +
      "⚠️ این شماره در لیست دانش‌آموزان یافت نشد.\n\n" +
      "👤 لطفاً نام و نام خانوادگی دانش‌آموز را وارد کنید:\n" +
      "❌ /cancel",
    CANCEL_MENU
  );
}

// وقتی کاربر روی دکمه دانش‌آموز کلیک می‌کنه (اتصال)
export async function handlePickStudent(env, chatId, messageId, studentId) {
  const stuStr = await kvGet(env, "student_temp_" + chatId);
  const students = JSON.parse(stuStr || "[]");
  const stu = students.find((s) => s.id === studentId);
  if (!stu) return;

  // ذخیره اطلاعات در users و اتصال در user_students
  await saveUserToD1(env, chatId, stu.parent_phone, stu.full_name, stu.class_name);
  await linkUserToStudent(env, chatId, stu.id);

  await kvDelete(env, "pending_" + chatId);
  await kvDelete(env, "student_temp_" + chatId);

  await editMessageText(
    env,
    chatId,
    messageId,
    `✅ *ثبت‌نام انجام شد*\n\n👤 ${escapeMarkdown(stu.full_name)}\n🏫 ${escapeMarkdown(stu.class_name)}`
  );
  await sendMessage(env, chatId, "🏠 به منوی اصلی خوش آمدید:", MAIN_MENU);
}
