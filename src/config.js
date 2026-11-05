export const TERMS_TEXT = "⚠️ *توجه مهم* ⚠️\n\n🔹 تمام خدمات این ربات *فقط* با شماره موبایل اولیا انجام می‌شود.\n\n🔹 انجام هر نوع رویداد به غیر از موبایل پدر یا مادر *خلاف قانون* بوده و *پیگرد خواهد داشت*.\n\n🔹 در انجام هر خدمت، شماره موبایل درخواست‌کننده *مسئول* خواهد بود.\n\n✅ با ادامه، شما این شرایط را می‌پذیرید.";

export const CLASSES = ["هفتم ۵", "هفتم ۶", "هفتم ۷", "هشتم ۳", "هشتم ۴", "هشتم ۵", "هشتم ۶", "نهم ۵", "نهم ۶", "نهم ۷"];
export const DAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه"];
export const MONTHS = ["مهر", "آبان", "آذر", "دی", "بهمن", "اسفند", "فروردین", "اردیبهشت", "خرداد"];
export const SUBJECTS = ["قرآن", "عربی", "معارف", "فارسی", "نگارش", "املا", "مطالعات", "هنر", "زبان", "کار و فناوری", "ریاضی", "علوم", "دفاعی", "تفکر"];
export const DISCIPLINE_CATEGORIES = ["غیبت", "تأخیر", "بی‌انضباطی", "عدم انجام تکالیف", "صحبت در کلاس", "استفاده از موبایل", "سایر"];

export const MAX_MSG_LEN = 3800;
export const RATE_LIMIT_WINDOW_SEC = 60;
export const RATE_LIMIT_MAX = 30;

export const VALID_STATE_FIELDS = new Set(["pending", "admin_state", "form_data", "cal_field", "grade_register", "reg_grade_list", "event_form", "student_temp", "discipline_temp", "active_student_id"]);

export const STATE_FIELD_PREFIXES = {
  "pending_": "pending",
  "admin_state_": "admin_state",
  "form_": "form_data",
  "cal_field_": "cal_field",
  "grade_register_": "grade_register",
  "reg_grade_list_": "reg_grade_list",
  "event_form_": "event_form",
  "student_temp_": "student_temp",
  "discipline_temp_": "discipline_temp",
};

export function getGreeting() {
  const h = new Date(Date.now() + (3 * 60 + 30) * 60 * 1000).getUTCHours();
  if (h < 12) return "🌅 صبح بخیر";
  if (h < 17) return "☀️ ظهر بخیر";
  if (h < 20) return "🌆 عصر بخیر";
  return "🌙 شب بخیر";
}
