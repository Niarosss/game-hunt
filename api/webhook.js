import axios from "axios";
import { TelegramBot } from "../lib/telegram.js";
import { Storage } from "../lib/storage.js";
import settings from "../config/settings.js";

export default async function handler(req, res) {
  if (req.query.secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return res.status(401).send("Unauthorized");
  }

  if (!req.body || !req.body.message) {
    return res.status(200).send("OK");
  }

  const { message } = req.body;

  if (message && message.text) {
    const command = message.text.toLowerCase();
    const adminChatId = String(process.env.TELEGRAM_ADMIN_CHAT_ID);
    const userChatId = String(message.chat.id);

    if (userChatId === adminChatId) {
      const responseBot = new TelegramBot(
        process.env.TELEGRAM_BOT_TOKEN,
        userChatId,
        settings.telegram
      );

      if (command === "/check") {
        try {
          if (settings.telegram.log) {
            console.log(
              `✅ Отримано команду /check. Відправляю попереднє повідомлення...`
            );
          }
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
            "❌ Критична помилка в обробнику /check:",
            error.message
          );
          if (!res.headersSent) {
            res.status(500).send("Server Error");
          }
        }
      } else if (command === "/stats") {
        try {
          if (settings.telegram.log) {
            console.log(`📊 Отримано команду /stats. Генерую звіт...`);
          }
          const storage = new Storage();
          const stats = await storage.getStats();
          await responseBot.sendStatsReport(stats);
          res.status(200).send("OK: Stats sent");
        } catch (error) {
          console.error(
            "❌ Помилка при обробці команди /stats:",
            error.message
          );
          await responseBot.sendMessage(
            `❌ Не вдалося отримати статистику. Помилка: ${error.message}`
          );
          if (!res.headersSent) {
            res.status(500).send("Server Error for /stats");
          }
        }
      } else if (command === "/help") {
        try {
          if (settings.telegram.log) {
            console.log(`❔ Отримано команду /help. Відправляю довідку...`);
          }
          await responseBot.sendHelpMessage();
          res.status(200).send("OK: Help message sent");
        } catch (error) {
          console.error("❌ Помилка при обробці команди /help:", error.message);
          await responseBot.sendMessage(
            `❌ Не вдалося надіслати довідку. Помилка: ${error.message}`
          );
          if (!res.headersSent) {
            res.status(500).send("Server Error for /help");
          }
        }
      } else {
        if (settings.telegram.log) {
          console.log(`ℹ️ Отримано невідому команду: ${command}`);
        }
        res.status(200).send("OK: Unknown command");
      }
    } else {
      if (settings.telegram.log) {
        console.log(
          `ℹ️ Команду ${command} отримано від неавторизованого користувача: ${userChatId}`
        );
      }
      res.status(200).send("OK");
    }
  } else {
    res.status(200).send("OK");
  }
}
