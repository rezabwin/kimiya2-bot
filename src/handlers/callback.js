import { answerCallback, editMessageText, editMessageReplyMarkup, sendMessage } from "../core/api.js";
import { kvGet, kvPut, kvDelete } from "../core/state.js";
import { isAdmin } from "../core/auth.js";
import { handlePickStudent } from "../flows/auth.js";
import { handleFormCallback } from "../flows/academics.js";
import { handleDisciplinePick, handleDisciplineGo, handleDisciplineCategory } from "../flows/discipline.js";
import { updateUserProfileClass, saveUserToD1 } from "../db/users.js";
import { getUserProfile } from "../db/users.js";
import { MAIN_MENU, ADMIN_MENU } from "../keyboards.js";
import { escapeMarkdown } from "../lib/strings.js";

export async function handleCallback(env, callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const data = callbackQuery.data;
  const cbId = callbackQuery.id;

  if (data === "noop") { await answerCallback(env, cbId, ""); return; }

  // انتخاب دانش‌آموز در ثبت‌نام
  if (data.startsWith("pickstu_")) {
    const studentId = parseInt(data.replace("pickstu_", ""));
    await handlePickStudent(env, chatId, messageId, studentId);
    await answerCallback(env, cbId, "✅");
    return;
  }

  // انتخاب کلاس در ثبت‌نام (کلاس جدید)
  if (data.startsWith("cls_")) {
    const classIndex = parseInt(data.replace("cls_", ""));
    const pending = await kvGet(env, "pending_" + chatId);
    
    if (pending === "class") {
      const CLASSES = ["هفتم ۵", "هفتم ۶", "هفتم ۷", "هشتم ۳", "هشتم ۴", "هشتم ۵", "هشتم ۶", "نهم ۵", "نهم ۶", "نهم ۷"];
      const selectedClass = CLASSES[classIndex];
      
      await updateUserProfileClass(env, chatId, selectedClass);
      await kvDelete(env, "pending_" + chatId);
      
      const profile = await getUserProfile(env, chatId);
      const auth = await env.DB.prepare("SELECT phone FROM users WHERE chat_id = ?").bind(chatId).first();
      await saveUserToD1(env, chatId, auth?.phone, profile?.name, selectedClass);
      
      await editMessageText(env, chatId, messageId, `✅ کلاس: *${selectedClass}*`);
      await sendMessage(env, chatId, `🎉 *ثبت‌نام انجام شد*\n\n📛 ${escapeMarkdown(profile?.name || "—")}\n🎓 ${selectedClass}`, MAIN_MENU);
      await answerCallback(env, cbId, "✅");
      return;
    }
  }

  // فرم‌های غیبت و مرخصی
  const formHandled = await handleFormCallback(env, chatId, messageId, data, cbId);
  if (formHandled) return;

  // انضباط
  if (data.startsWith("disc_pick_")) {
    const studentId = parseInt(data.replace("disc_pick_", ""));
    await handleDisciplinePick(env, chatId, messageId, studentId, cbId);
    return;
  }
  if (data === "disc_go") {
    await handleDisciplineGo(env, chatId, messageId, cbId);
    return;
  }
  if (data.startsWith("disc_cat_")) {
    const category = decodeURIComponent(data.replace("disc_cat_", ""));
    await handleDisciplineCategory(env, chatId, messageId, category, cbId);
    return;
  }
  if (data === "disc_cancel") {
    await kvDelete(env, "discipline_temp_" + chatId);
    await kvDelete(env, "admin_state_" + chatId);
    await editMessageText(env, chatId, messageId, "❌ لغو شد.");
    await sendMessage(env, chatId, "❌ لغو شد.", ADMIN_MENU);
    await answerCallback(env, cbId, "لغو");
    return;
  }

  // تأیید/رد درخواست‌ها توسط مدیر
  const parts = data.split("|");
  if (parts.length === 3) {
    if (!isAdmin(env, chatId)) { await answerCallback(env, cbId, "⛔"); return; }
    const [action, key, parentChatId] = parts;
    const type = key.split("_")[0];
    const id = parseInt(key.split("_")[2]);
    
    let status = action === "approve" ? "✅ تأیید شد" : "❌ رد شد";
    let notifyText = action === "approve" ? "✅ *درخواست شما تأیید شد*" : "❌ *درخواست شما رد شد*\n\nبا مدرسه تماس بگیرید.";

    if (type === "absence") await env.DB.prepare("UPDATE absences SET status=?, status_date=? WHERE id=?").bind(status, new Date().toLocaleDateString("fa-IR"), id).run();
    else if (type === "leave") await env.DB.prepare("UPDATE leaves SET status=?, status_date=? WHERE id=?").bind(status, new Date().toLocaleDateString("fa-IR"), id).run();
    
    await editMessageReplyMarkup(env, chatId, messageId, null);
    await sendMessage(env, chatId, `🔖 ${status}`);
    await sendMessage(env, parseInt(parentChatId), notifyText);
    await answerCallback(env, cbId, status);
    return;
  }
}
