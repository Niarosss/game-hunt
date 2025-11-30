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
      try {
        if (settings.telegram.log) {
          console.log(
            `✅ Отримано команду /check. Відправляю відповідь і запускаю воркер...`
          );
        }

        const responseBot = new TelegramBot(
          process.env.TELEGRAM_BOT_TOKEN,
          userChatId
        );

        await responseBot.sendMessage(
          "✅ Прийнято. Запускаю перевірку роздач..."
        );

        res.status(200).send("OK");

        (async () => {
          const workerUrl = `https://${process.env.VERCEL_URL}/check-games?reportChatId=${userChatId}`;
          try {
            await axios.get(workerUrl, { timeout: 25000 });
            if (settings.telegram.log) {
              console.log(`✅ Фоновий запуск воркера check-games успішний.`);
            }
          } catch (err) {
            console.error(
              "❌ Помилка у фоновому запуску воркера check-games:",
              err.message
            );
            await responseBot.sendMessage(
              `❌ Не вдалося запустити перевірку у фоні. Помилка: ${err.message}`
            );
          }
        })();
      } catch (error) {
        console.error(
          "❌ Критична помилка в обробнику вебхука:",
          error.message
        );
        if (!res.headersSent) {
          res.status(500).send("Server Error");
        }
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
