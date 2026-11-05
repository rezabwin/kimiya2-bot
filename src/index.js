import { handleUpdate } from "./handlers/message.js";
import { handleCallback } from "./handlers/callback.js";

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ ok: true, status: "Kimiya2 Bot is running" }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    
    try {
      const update = await request.json();
      
      // پردازش در پس‌زمینه (برای اینکه به بله سریع جواب بدیم)
      ctx.waitUntil((async () => {
        try {
          if (update.callback_query) {
            await handleCallback(env, update.callback_query);
          } else if (update.message) {
            await handleUpdate(env, update.message, ctx);
          }
        } catch (e) {
          console.error("[Inner Error]", e.message, e.stack);
        }
      })());
      
      return new Response("OK", { status: 200 });
    } catch (e) {
      return new Response("OK", { status: 200 });
    }
  },

  // مدیریت صف (برای ارسال گروهی)
  async queue(batch, env, ctx) {
    for (const message of batch.messages) {
      try {
        const { chatId, text } = message.body;
        // اینجا می‌تونیم از sendMessage استفاده کنیم
        await fetch(`https://tapi.bale.ai/bot${env.BALE_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: "Markdown" })
        });
        message.ack();
      } catch (e) {
        message.retry();
      }
    }
  },

  // کرون (زمان‌بندی)
  async scheduled(event, env, ctx) {
    // اینجا کارهای زمان‌بندی شده انجام می‌شه
    console.log("[Cron] triggered at", new Date().toISOString());
  }
};
