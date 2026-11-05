export async function getScheduleFromD1(env, className) {
  try {
    const r = await env.DB.prepare("SELECT * FROM schedule WHERE class_name = ?").bind(className).all();
    if (!r.results || r.results.length === 0) return null;
    const schedule = {};
    for (const row of r.results) { schedule[row.day] = [row.lesson1, row.lesson2, row.lesson3]; }
    return schedule;
  } catch { return null; }
}

export async function saveScheduleDayToD1(env, className, day, lessons) {
  try {
    const existing = await env.DB.prepare("SELECT id FROM schedule WHERE class_name = ? AND day = ?").bind(className, day).first();
    if (existing) {
      await env.DB.prepare("UPDATE schedule SET lesson1 = ?, lesson2 = ?, lesson3 = ? WHERE class_name = ? AND day = ?").bind(lessons[0], lessons[1], lessons[2], className, day).run();
    } else {
      await env.DB.prepare("INSERT INTO schedule (class_name, day, lesson1, lesson2, lesson3) VALUES (?, ?, ?, ?, ?)").bind(className, day, lessons[0], lessons[1], lessons[2]).run();
    }
    return true;
  } catch { return false; }
}

export function renderSchedule(cls, s, DAYS) {
  let t = `📅 *برنامه هفتگی — ${cls}*\n\n`;
  for (const day of DAYS) {
    t += `🔹 *${day}:*\n`;
    if (s && s[day]) {
      for (let i = 0; i < 3; i++) t += `   زنگ ${i + 1}: ${s[day][i] || "—"}\n`;
    } else {
      t += "   _ثبت نشده_\n";
    }
    t += "\n";
  }
  return t;
}
