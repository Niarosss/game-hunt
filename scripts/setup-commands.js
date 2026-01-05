import { TelegramBot } from "../lib/telegram.js";
import settings from "../config/settings.js";

import dotenv from "dotenv";
dotenv.config();

if (
  process.env.NODE_ENV !== "production" ||
  process.env.VERCEL_ENV === "development"
) {
  dotenv.config({ path: ".env.local", override: true });
}

async function setupCommands() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    console.error(
      "❌ TELEGRAM_BOT_TOKEN не знайдено. Будь ласка, встановіть його в .env файлі або як змінну середовища."
    );
    return;
  }

  const telegram = new TelegramBot(botToken, null, settings.telegram);

  const commands = [
    {
      command: "check",
      description: "Розпочати перевірку нових безкоштовних ігор",
    },
    {
      command: "stats",
      description: "Показати статистику по збереженим іграм",
    },
    { command: "help", description: "Показати довідку по командам бота" },
  ];

  console.log("🛠️ Встановлюю команди для бота...");
  const success = await telegram.setBotCommands(commands);

  if (success) {
    console.log("✅ Команди бота успішно зареєстровані.");
    console.log(
      "💡 Щоб побачити зміни, може знадобитися перезапустити Telegram-клієнт."
    );
  } else {
    console.error("❌ Не вдалося зареєструвати команди бота.");
  }
}

setupCommands().catch((error) => {
  console.error("💥 Помилка під час налаштування команд:", error);
  process.exit(1);
});
