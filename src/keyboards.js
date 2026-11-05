import { CLASSES, MONTHS, DAYS } from "./config.js";
import { getJalaliMonthName, getJalaliMonthDays, getFirstDayOfJalaliMonth } from "./lib/jalali.js";

// ================== منوهای پایین صفحه (Reply) ==================
export const SHARE_PHONE_MENU = { keyboard: [[{ text: "📱 اشتراک شماره موبایل من", request_contact: true }]], resize_keyboard: true, one_time_keyboard: true };

export const MAIN_MENU = {
  keyboard: [
    [{ text: "📝 خدمات آموزشی" }, { text: "📊 نمرات و کارنامه" }],
    [{ text: "📅 برنامه و مرخصی" }, { text: "🎫 رویدادها و ثبت‌نام" }],
    [{ text: "💬 ارتباط با مدرسه" }, { text: "👤 پروفایل من" }],
    [{ text: "ℹ️ راهنما" }]
  ],
  resize_keyboard: true
};

export const ACADEMIC_MENU = {
  keyboard: [
    [{ text: "📝 ثبت غیبت" }, { text: "📅 درخواست مرخصی" }],
    [{ text: "📋 گزارش‌های من" }, { text: "📋 سوابق انضباطی" }],
    [{ text: "🔙 بازگشت" }]
  ],
  resize_keyboard: true
};

export const GRADES_MENU = {
  keyboard: [
    [{ text: "📊 نمرات دانش‌آموز" }, { text: "📊 درخواست نمرات" }],
    [{ text: "📈 کارنامه ماهانه" }, { text: "🎯 نقاط قوت و ضعف" }],
    [{ text: "🔙 بازگشت" }]
  ],
  resize_keyboard: true
};

export const SCHEDULE_LEAVE_MENU = {
  keyboard: [
    [{ text: "📅 برنامه هفتگی" }, { text: "📅 درخواست مرخصی" }],
    [{ text: "🔙 بازگشت" }]
  ],
  resize_keyboard: true
};

export const EVENTS_USER_MENU = {
  keyboard: [
    [{ text: "🎫 ثبت‌نام‌ها" }],
    [{ text: "🔙 بازگشت" }]
  ],
  resize_keyboard: true
};

export const CONTACT_MENU = {
  keyboard: [
    [{ text: "📩 پیام به معاون" }, { text: "💬 پیام به مدیر" }],
    [{ text: "🔙 بازگشت" }]
  ],
  resize_keyboard: true
};

export const PROFILE_MENU = { keyboard: [[{ text: "✏️ ویرایش نام" }, { text: "🎓 ویرایش کلاس" }], [{ text: "🔄 تغییر دانش‌آموز" }], [{ text: "🔙 بازگشت" }]], resize_keyboard: true };
export const CANCEL_MENU = { keyboard: [[{ text: "❌ لغو" }]], resize_keyboard: true };

export const ADMIN_MENU = { keyboard: [
  [{ text: "📊 داشبورد" }, { text: "📊 آمار کلی" }],
  [{ text: "👨‍🎓 مدیریت دانش‌آموزان" }, { text: "📋 ثبت مورد انضباطی" }],
  [{ text: "📝 ثبت غیبت سریع" }, { text: "📚 آخرین درخواست‌های نمره" }],
  [{ text: "📝 ثبت نمره" }, { text: "📅 مدیریت برنامه هفتگی" }],
  [{ text: "🎫 مدیریت ثبت‌نام‌ها" }, { text: "📨 ارسال پیام گروهی" }],
  [{ text: "🚫 اعلام تعطیلی" }, { text: "💬 پیام‌های اولیا" }],
  [{ text: "⚙️ تنظیمات و ابزارها" }, { text: "🚪 خروج از پنل مدیر" }]
], resize_keyboard: true };

export const STUDENTS_MENU = { keyboard: [
  [{ text: "➕ افزودن دانش‌آموز" }, { text: "📤 آپلود CSV دانش‌آموزان" }],
  [{ text: "👥 لیست دانش‌آموزان کلاس" }, { text: "🔗 اتصال ولی به دانش‌آموز" }],
  [{ text: "🔙 بازگشت به پنل" }]
], resize_keyboard: true };

// ================== منوهای شیشه‌ای (Inline) ==================
export function buildClassKeyboard() {
  const rows = []; let row = [];
  for (let i = 0; i < CLASSES.length; i++) {
    row.push({ text: CLASSES[i], callback_data: "cls_" + i });
    if (row.length === 3) { rows.push(row); row = []; }
  }
  if (row.length > 0) rows.push(row);
  return { inline_keyboard: rows };
}

export function buildMonthKeyboard() {
  const rows = []; let row = [];
  for (let i = 0; i < MONTHS.length; i++) {
    row.push({ text: MONTHS[i], callback_data: "gm_month_" + i });
    if (row.length === 3) { rows.push(row); row = []; }
  }
  if (row.length > 0) rows.push(row);
  return { inline_keyboard: rows };
}

export function buildCalendarKeyboard(jy, jm, prefix) {
  const rows = [];
  const monthName = getJalaliMonthName(jm);
  const prevJy = jm === 1 ? jy - 1 : jy, prevJm = jm === 1 ? 12 : jm - 1;
  const nextJy = jm === 12 ? jy + 1 : jy, nextJm = jm === 12 ? 1 : jm + 1;
  
  rows.push([
    { text: "◀️ " + getJalaliMonthName(prevJm), callback_data: prefix + "_nav_" + prevJy + "_" + prevJm },
    { text: monthName + " " + jy, callback_data: "noop" },
    { text: getJalaliMonthName(nextJm) + " ▶️", callback_data: prefix + "_nav_" + nextJy + "_" + nextJm }
  ]);
  
  rows.push([{ text: "ش", callback_data: "noop" }, { text: "ی", callback_data: "noop" }, { text: "د", callback_data: "noop" }, { text: "س", callback_data: "noop" }, { text: "چ", callback_data: "noop" }, { text: "پ", callback_data: "noop" }, { text: "ج", callback_data: "noop" }]);
  
  const daysInMonth = getJalaliMonthDays(jy, jm);
  const firstDay = getFirstDayOfJalaliMonth(jy, jm);
  let row = [];
  for (let i = 0; i < firstDay; i++) row.push({ text: " ", callback_data: "noop" });
  
  for (let d = 1; d <= daysInMonth; d++) {
    row.push({ text: String(d), callback_data: prefix + "_day_" + jy + "_" + jm + "_" + d });
    if (row.length === 7) { rows.push(row); row = []; }
  }
  
  if (row.length > 0) {
    while (row.length < 7) row.push({ text: " ", callback_data: "noop" });
    rows.push(row);
  }
  
  rows.push([{ text: "📅 امروز", callback_data: prefix + "_today" }]);
  return { inline_keyboard: rows };
}
