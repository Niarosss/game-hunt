import { EpicGames } from "../lib/epic-games.js";
import { Steam } from "../lib/steam.js";
import { TelegramBot } from "../lib/telegram.js";
import { Storage } from "../lib/storage.js";

// Функція форматування для нових ігор
function formatNewGamesMessage(games, platform, title) {
  let message = `${title}\n`;
  message += `🎮 <b>${platform}</b>\n\n`;

  games.forEach((game) => {
    const priceInfo = game.hasMeaningfulPrice
      ? `💵 <s>${game.originalPrice}</s> <b>БЕЗКОШТОВНО</b>\n`
      : "🎁 <b>БЕЗКОШТОВНО</b>\n";

    const endDate = game.endDate
      ? `⏰ До: <b>${game.endDate.toLocaleDateString("uk-UA")}</b>\n`
      : "";

    message += `🎮 <b>${game.title}</b>\n`;
    message += priceInfo;
    message += endDate;
    message += `🔗 <a href="${game.url}">Отримати гру</a>\n\n`;
  });

  return message;
}

export default async function handler(req, res) {
  try {
    console.log("🔄 Перевіряю нові роздачі...");

    // Ініціалізація
    const epic = new EpicGames();
    const steam = new Steam();
    const storage = new Storage();
    const telegram = new TelegramBot(
      process.env.TELEGRAM_BOT_TOKEN,
      process.env.TELEGRAM_CHAT_ID
    );

    // Перевірка змінних середовища
    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
      console.log("❌ Відсутні змінні середовища");
      return res.status(500).json({
        success: false,
        error: "Відсутні TELEGRAM_BOT_TOKEN або TELEGRAM_CHAT_ID",
      });
    }

    console.log("✅ Змінні середовища налаштовані");

    // Отримуємо поточні ігри
    const [currentEpicGames, currentSteamGames] = await Promise.all([
      epic.getFreeGames(),
      steam.getFreeGames(),
    ]);

    console.log(
      `📊 Знайдено ігор: Epic: ${currentEpicGames.length}, Steam: ${currentSteamGames.length}`
    );

    // Оновлюємо дані та отримуємо зміни
    const changes = storage.updateGames(currentEpicGames, currentSteamGames);

    console.log("\n📊 ЗМІНИ:");
    console.log(`🆕 Нові Epic Games: ${changes.newEpic.length}`);
    console.log(`🆕 Нові Steam: ${changes.newSteam.length}`);
    console.log(`🔚 Завершилися Epic: ${changes.endedEpic.length}`);
    console.log(`🔚 Завершилися Steam: ${changes.endedSteam.length}`);

    let messagesSent = 0;

    // Надсилаємо повідомлення про нові ігри Epic Games
    if (changes.newEpic.length > 0) {
      console.log("📤 Надсилаю повідомлення про нові ігри Epic Games...");

      const activeNewEpic = changes.newEpic.filter((game) => game.isActive);

      if (activeNewEpic.length > 0) {
        const message = formatNewGamesMessage(
          activeNewEpic,
          "Epic Games",
          "🆕 НОВА РОЗДАЧА!"
        );
        const success = await telegram.sendMessage(message);
        if (success) {
          messagesSent++;
          console.log("✅ Повідомлення Epic Games відправлено");
        } else {
          console.log("❌ Помилка відправки повідомлення Epic Games");
        }
      }
    }

    // Надсилаємо повідомлення про нові ігри Steam
    if (changes.newSteam.length > 0) {
      console.log("📤 Надсилаю повідомлення про нові ігри Steam...");

      const message = formatNewGamesMessage(
        changes.newSteam,
        "Steam",
        "🆕 НОВА РОЗДАЧА!"
      );
      const success = await telegram.sendMessage(message);
      if (success) {
        messagesSent++;
        console.log("✅ Повідомлення Steam відправлено");
      } else {
        console.log("❌ Помилка відправки повідомлення Steam");
      }
    }

    if (messagesSent === 0) {
      console.log("ℹ️ Нових роздач не знайдено");
    }

    const stats = storage.getStats();

    res.status(200).json({
      success: true,
      changes: {
        newEpic: changes.newEpic.length,
        newSteam: changes.newSteam.length,
        endedEpic: changes.endedEpic.length,
        endedSteam: changes.endedSteam.length,
      },
      messagesSent: messagesSent,
      stats: stats,
    });
  } catch (error) {
    console.error("❌ Помилка перевірки роздач:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
