const API_TIMEOUT_MS = 10000;
const MAX_RETRIES = 3;

function getApiBase(env) {
  return `https://tapi.bale.ai/bot${env.BALE_BOT_TOKEN}`;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = API_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function sendMessage(env, chatId, text, replyMarkup, options = {}) {
  if (!chatId || isNaN(Number(chatId))) return { ok: false, error: "invalid_chat_id" };
  const body = { chat_id: chatId, text: text };
  if (options.parseMode !== null) body.parse_mode = options.parseMode || "Markdown";
  if (replyMarkup) body.reply_markup = JSON.stringify(replyMarkup);

  let lastError = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(`${getApiBase(env)}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) return { ok: true };
      const errText = await res.text();
      if (res.status === 403) return { ok: false, status: 403, error: "blocked" };
      if (res.status === 400) {
        if (body.parse_mode && (errText.includes("parse") || errText.includes("entity") || errText.includes("markdown") || errText.includes("can't"))) {
          const body2 = { ...body };
          delete body2.parse_mode;
          const res2 = await fetchWithTimeout(`${getApiBase(env)}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body2),
          });
          if (res2.ok) return { ok: true, plainFallback: true };
          return { ok: false, status: res2.status, error: await res2.text() };
        }
        return { ok: false, status: 400, error: errText };
      }
      lastError = { status: res.status, error: errText };
    } catch (e) {
      lastError = { error: e.message };
    }
    if (attempt < MAX_RETRIES) await new Promise((r) => setTimeout(r, 500 * attempt));
  }
  return { ok: false, ...(lastError || {}) };
}

export async function sendLongMessage(env, chatId, text, replyMarkup, maxLen = 3800) {
  if (text.length <= maxLen) return await sendMessage(env, chatId, text, replyMarkup);
  const lines = text.split("\n");
  let chunk = "", firstResult = null, lastResult = null;
  for (const line of lines) {
    if ((chunk + line + "\n").length > maxLen) {
      const r = await sendMessage(env, chatId, chunk, null);
      if (!firstResult) firstResult = r;
      lastResult = r;
      chunk = "";
    }
    chunk += line + "\n";
  }
  if (chunk) {
    const r = await sendMessage(env, chatId, chunk, replyMarkup);
    if (!firstResult) firstResult = r;
    lastResult = r;
  }
  return firstResult || lastResult || { ok: false };
}

export async function editMessageText(env, chatId, messageId, text, replyMarkup, options = {}) {
  const body = { chat_id: chatId, message_id: messageId, text: text };
  if (options.parseMode !== null) body.parse_mode = options.parseMode || "Markdown";
  if (replyMarkup) body.reply_markup = JSON.stringify(replyMarkup);
  try {
    const res = await fetchWithTimeout(`${getApiBase(env)}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text();
      if (errText.includes("parse") || errText.includes("entity")) {
        const body2 = { ...body };
        delete body2.parse_mode;
        await fetchWithTimeout(`${getApiBase(env)}/editMessageText`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body2) });
      }
    }
  } catch (e) {}
}

export async function answerCallback(env, callbackId, text = "") {
  try {
    await fetchWithTimeout(`${getApiBase(env)}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackId, text }),
    });
  } catch (e) {}
}

export async function sendDocument(env, chatId, filename, content, caption) {
  const fd = new FormData();
  fd.append("chat_id", chatId);
  fd.append("caption", caption || "");
  fd.append("document", new Blob([content], { type: "text/csv" }), filename);
  try {
    await fetchWithTimeout(`${getApiBase(env)}/sendDocument`, { method: "POST", body: fd });
  } catch (e) {}
}
