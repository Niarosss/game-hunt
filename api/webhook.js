import axios from "axios";
import { TelegramBot } from "../lib/telegram.js";
import { Storage } from "../lib/storage.js";
import settings from "../config/settings.js";

export default async function handler(req, res) {
  if (req.query.secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return res.status(401).send("Unauthorized");
  }

  const message = req.body?.message;
  const text = message?.text?.toLowerCase();
  if (!text) return res.status(200).send("OK");

  const adminChatId = String(process.env.TELEGRAM_ADMIN_CHAT_ID);
  const userChatId = String(message.chat.id);

  if (userChatId !== adminChatId) return res.status(200).send("OK");

  const bot = new TelegramBot(
    process.env.TELEGRAM_BOT_TOKEN,
    userChatId,
    settings.telegram
  );

  const commands = {
    "/check": async () => {
      await bot.sendMessage("<b>Прийнято</b> 🫡\n\nЗапускаю перевірку...");
      try {
        await axios.get(
          `https://${process.env.VERCEL_URL}/check-games?reportChatId=${userChatId}`,
          { timeout: 25000 }
        );
        return "OK: Worker started";
      } catch (e) {
        await bot.sendMessage(
          "❌ Не вдалося запустити перевірку: " + e.message
        );
        return "Error: Worker failed to start";
      }
    },
    "/stats": async () => {
      const storage = new Storage();
      const stats = await storage.getStats();
      await bot.sendStatsReport(stats);
      return "OK: Stats sent";
    },
    "/help": async () => {
      await bot.sendHelpMessage();
      return "OK: Help sent";
    },
  };

  const handlerFn = commands[text];
  const result = handlerFn ? await handlerFn() : "OK: Unknown command";

  return res.status(200).send(result);
}
