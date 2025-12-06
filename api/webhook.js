import axios from "axios";
import { TelegramBot } from "../lib/telegram.js";
import settings from "../config/settings.js";

export default async function handler(req, res) {
  if (req.query.secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return res.status(401).send("Unauthorized");
  }

  if (!req.body || !req.body.message) {
    return res.status(200).send("OK");
  }

  const { message } = req.body;

  if (message && message.text && message.text.toLowerCase() === "/check") {
    const adminChatId = String(process.env.TELEGRAM_ADMIN_CHAT_ID);
    const userChatId = String(message.chat.id);

    if (userChatId === adminChatId) {
      if (settings.telegram.log) {
        console.log(
          `✅ Отримано команду /check. Відправляю попереднє повідомлення...`
        );
      }

      const responseBot = new TelegramBot(
        process.env.TELEGRAM_BOT_TOKEN,
        userChatId
      );

      await responseBot.sendMessage(
        "<b>Прийнято</b> 🫡\n\nЗапускаю перевірку роздач..."
      );

      const workerUrl = `https://${process.env.VERCEL_URL}/check-games?reportChatId=${userChatId}`;

      try {
        await axios.get(workerUrl, { timeout: 25000 });

        if (settings.telegram.log) {
          console.log(`✅ Воркер check-games успішно запущено.`);
        }

        res.status(200).send("OK: Worker started");
      } catch (err) {
        console.error(
          "❌ Не вдалося запустити воркер check-games:",
          err.message
        );

        await responseBot.sendMessage(
          `❌ Не вдалося запустити перевірку. Помилка: ${err.message}`
        );

        res.status(200).send("Error: Worker failed to start");
      }
    } else {
      if (settings.telegram.log) {
        console.log(
          `ℹ️ Команду /check отримано від неавторизованого користувача: ${userChatId}`
        );
      }
      res.status(200).send("OK");
    }
  } else {
    res.status(200).send("OK");
  }
}
