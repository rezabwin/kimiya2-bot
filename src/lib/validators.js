export function normalizePhone(phone) {
  if (!phone) return "";
  let c = String(phone).replace(/[\s\-\(\)]/g, "");
  if (c.startsWith("+")) c = c.substring(1);
  if (c.startsWith("98") && c.length === 12) c = "0" + c.substring(2);
  if (c.startsWith("9") && c.length === 10) c = "0" + c;
  return c;
}

export function validatePhone(phone) {
  return /^09\d{9}$/.test(normalizePhone(phone));
}

export function looksLikeGrades(text) {
  if (!text) return false;
  const t = text.trim();
  if (t === "") return false;
  return /^[\d\s,.\-]+$/.test(t) && /\d/.test(t);
}

export function parseGradesList(text) {
  if (!looksLikeGrades(text)) return null;
  const grades = text.split(",").map((s) => s.trim()).filter(Boolean);
  if (grades.length === 0 || grades.length > 5) return null;
  for (const g of grades) {
    if (!/^\d+(\.\d+)?$/.test(g)) return null;
  }
  while (grades.length < 5) grades.push("-");
  return grades;
}

export function safeJsonParse(str, fallback = null) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}
