import { normalizePhone } from "../lib/validators.js";

export function isAdmin(env, chatId) {
  return Number(chatId) === Number(env.ADMIN_CHAT_ID);
}

export function isVicePrincipal(env, chatId) {
  return Number(chatId) === Number(env.VICE_PRINCIPAL_ID);
}

export async function isPhoneAllowed(env, phone) {
  try {
    const r = await env.DB.prepare("SELECT phone FROM allowed_phones WHERE phone = ?").bind(normalizePhone(phone)).first();
    return !!r;
  } catch { return false; }
}

export async function getUserAuth(env, chatId) {
  try {
    const r = await env.DB.prepare("SELECT phone FROM users WHERE chat_id = ?").bind(chatId).first();
    return r?.phone || null;
  } catch { return null; }
}

export async function checkRateLimit(env, chatId) {
  try {
    const key = `rate_${chatId}`;
    const now = Math.floor(Date.now() / 1000);
    const raw = await env.KV.get(key);
    let data = raw ? JSON.parse(raw) : null;
    if (!data || now - data.start > 60) {
      data = { start: now, count: 1 };
    } else {
      data.count++;
    }
    await env.KV.put(key, JSON.stringify(data), { expirationTtl: 120 });
    return data.count <= 30;
  } catch { return true; }
}
