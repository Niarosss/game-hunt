import axios from "axios";
import { TelegramBot } from "../lib/telegram.js";
import settings from "../config/settings.js";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default async function handler(req, res) {
  if (req.query.secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return res.status(401).send("Unauthorized");
  }

  const { message } = req.body;

  if (message && message.text && message.text.toLowerCase() === "/check") {
    const adminChatId = String(process.env.TELEGRAM_ADMIN_CHAT_ID);
    const userChatId = String(message.chat.id);

    if (userChatId === adminChatId) {
      try {
        if (settings.telegram.log) {
          console.log(`✅ Отримано команду /check. Запускаю перевірку...`);
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
          const maxRetries = 3;
          let attempt = 0;

          while (attempt < maxRetries) {
            try {
              await axios.get(workerUrl, { timeout: 20000 });
              if (settings.telegram.log) {
                console.log(
                  `✅ Виклик check-games успішний (спроба ${attempt + 1})`
                );
              }
              return;
            } catch (err) {
              attempt++;
              console.error(
                `❌ Помилка при виклику check-games (спроба ${attempt}):`,
                err.message
              );
              if (attempt >= maxRetries) {
                await responseBot.sendMessage(
                  `❌ Не вдалося запустити перевірку після ${maxRetries} спроб. Остання помилка: ${err.message}`
                );
              } else {
                await delay(1000);
              }
            }
          }
        })();
      } catch (error) {
        console.error("❌ Помилка в обробнику вебхука:", error.message);
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
