import axios from "axios";
import { TelegramBot } from "../lib/telegram.js";
import settings from "../config/settings.js";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default async function handler(req, res) {
  if (req.query.secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return res.status(401).send("Unauthorized");
  }

  // Захист від порожнього тіла запиту
  if (!req.body || !req.body.message) {
    return res.status(200).send("OK");
  }

  const { message } = req.body;

  if (message && message.text && message.text.toLowerCase() === "/check") {
    const adminChatId = String(process.env.TELEGRAM_ADMIN_CHAT_ID);
    const userChatId = String(message.chat.id);

    if (userChatId === adminChatId) {
      if (settings.telegram.log) {
        console.log(`✅ Отримано команду /check. Починаю спроби запуску...`);
      }

      const responseBot = new TelegramBot(
        process.env.TELEGRAM_BOT_TOKEN,
        userChatId
      );

      const workerUrl = `https://${process.env.VERCEL_URL}/check-games?reportChatId=${userChatId}`;
      const maxRetries = 3;
      let attempt = 0;
      let success = false;

      while (attempt < maxRetries && !success) {
        attempt++;
        try {
          await axios.get(workerUrl, { timeout: 9000 });
          success = true;
          if (settings.telegram.log) {
            console.log(`✅ Виклик check-games успішний (спроба ${attempt})`);
          }
        } catch (err) {
          console.error(
            `❌ Помилка при виклику check-games (спроба ${attempt}):`,
            err.message
          );
          if (attempt < maxRetries) {
            await delay(1000);
          }
        }
      }

      if (success) {
        await responseBot.sendMessage(
          "✅ Прийнято. Запускаю перевірку роздач..."
        );
        res.status(200).send("OK: Worker started");
      } else {
        await responseBot.sendMessage(
          `❌ Не вдалося запустити перевірку після ${maxRetries} спроб.`
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
