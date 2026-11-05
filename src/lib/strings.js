export function escapeMarkdown(text) {
  if (text === null || text === undefined) return "";
  return String(text).replace(/([_*\[\]()~`>#+\-=|{}.!])/g, "\\$1");
}

export function escapeCode(text) {
  if (text === null || text === undefined) return "";
  return String(text).replace(/`/g, "'").replace(/\n/g, " ");
}

export function formatGrade(g) {
  if (!g || g === "ندارد" || g === "-") return "ندارد";
  return g;
}

export function formatAmountRial(amount) {
  try {
    if (amount === null || amount === undefined || isNaN(Number(amount))) return "—";
    const toman = Math.round(Number(amount) / 10);
    return toman.toLocaleString("fa-IR") + " تومان";
  } catch {
    return "—";
  }
}

export function escapeHtml(text) {
  if (text === null || text === undefined) return "";
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function truncate(text, len = 100) {
  if (!text) return "";
  const s = String(text);
  return s.length <= len ? s : s.substring(0, len - 3) + "...";
}
