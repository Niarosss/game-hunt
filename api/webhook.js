import axios from "axios";
import { TelegramBot } from "../lib/telegram.js";

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
        console.log(`✅ Отримано команду /check. Запускаю перевірку...`);

        const responseBot = new TelegramBot(
          process.env.TELEGRAM_BOT_TOKEN,
          userChatId
        );
        await responseBot.sendMessage(
          "✅ Прийнято. Запускаю перевірку роздач..."
        );

        res.status(200).send("OK");

        const workerUrl = `https://${process.env.VERCEL_URL}/api/check-games?reportChatId=${userChatId}`;
        axios.get(workerUrl).catch((err) => {
          console.error("❌ Помилка при виклику check-games:", err.message);
          responseBot.sendMessage(
            `❌ Не вдалося запустити перевірку. Помилка: ${err.message}`
          );
        });
      } catch (error) {
        console.error("❌ Помилка в обробнику вебхука:", error.message);
        if (!res.headersSent) {
          res.status(500).send("Server Error");
        }
      }
    } else {
      console.log(
        `ℹ️ Команду /check отримано від неавторизованого користувача: ${userChatId}`
      );
      res.status(200).send("OK");
    }
  } else {
    res.status(200).send("OK");
  }
}
