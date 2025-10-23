// check-giveaways.js
import { EpicGames } from "../lib/epic-games.js";
import { Steam } from "../lib/steam.js";
import { PSPlus } from "../lib/ps-plus.js"; // Додаємо PS Plus
import { TelegramBot } from "../lib/telegram.js";
import { Storage } from "../lib/storage.js";

// Форматування повідомлень
function formatNewGamesMessage(games, platform, title) {
  let message = `${title}\n`;
  message += `🎮 <b>${platform}</b>\n\n`;

  games.forEach((game) => {
    const priceInfo = game.hasMeaningfulPrice
      ? `💵 <s>${game.originalPrice}</s> <b>БЕЗКОШТОВНО</b>\n`
      : "🎁 <b>БЕЗКОШТОВНО</b>\n";

    const endDate = game.endDate
      ? `⏰ До: <b>${new Date(game.endDate).toLocaleDateString("uk-UA")}</b>\n`
      : "";

    message += `🎮 <b>${game.title}</b>\n${priceInfo}${endDate}`;
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
    const psPlus = new PSPlus();
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

    // Отримання ігор з усіх платформ
    const [currentEpicGames, currentSteamGames, psPlusGames] =
      await Promise.all([
        epic.getFreeGames(),
        steam.getFreeGames(),
        psPlus.getAllGames(), // Отримуємо всі ігри PS Plus
      ]);

    console.log(
      `📊 Знайдено ігор: Epic: ${currentEpicGames.length}, Steam: ${
        currentSteamGames.length
      }, PS Plus: ${psPlusGames.monthly.length + psPlusGames.catalog.length}`
    );

    // Оновлення даних
    const changes = await storage.updateGames(
      currentEpicGames,
      currentSteamGames,
      psPlusGames // Додаємо PS Plus
    );

    console.log("\n📊 ЗМІНИ:");
    console.log(`🆕 Нові Epic Games: ${changes.newEpic.length}`);
    console.log(`🆕 Нові Steam: ${changes.newSteam.length}`);
    console.log(`🆕 Нові PS Plus Monthly: ${changes.newPSPlus.monthly.length}`);
    console.log(`🆕 Нові PS Plus Catalog: ${changes.newPSPlus.catalog.length}`);

    let messagesSent = 0;

    // Epic Games
    if (changes.newEpic.length > 0) {
      console.log("📤 Надсилаю повідомлення про нові Epic Games...");
      const activeNewEpic = changes.newEpic.filter((g) => g.isActive);
      if (activeNewEpic.length > 0) {
        const message = formatNewGamesMessage(
          activeNewEpic,
          "Epic Games",
          "🆕 НОВА РОЗДАЧА!"
        );
        if (await telegram.sendMessage(message)) {
          messagesSent++;
          console.log("✅ Повідомлення Epic Games відправлено");
        }
      }
    }

    // Steam
    if (changes.newSteam.length > 0) {
      console.log("📤 Надсилаю повідомлення про нові Steam...");
      const message = formatNewGamesMessage(
        changes.newSteam,
        "Steam",
        "🆕 НОВА РОЗДАЧА!"
      );
      if (await telegram.sendMessage(message)) {
        messagesSent++;
        console.log("✅ Повідомлення Steam відправлено");
      }
    }

    // PS Plus
    if (
      changes.newPSPlus.monthly.length > 0 ||
      changes.newPSPlus.catalog.length > 0
    ) {
      console.log("📤 Надсилаю повідомлення про нові ігри PS Plus...");
      if (
        await telegram.sendPSPlusUpdate(
          changes.newPSPlus.monthly,
          changes.newPSPlus.catalog
        )
      ) {
        messagesSent++;
        console.log("✅ Повідомлення PS Plus відправлено");
      }
    }

    if (messagesSent === 0) console.log("ℹ️ Нових роздач не знайдено");

    const stats = await storage.getStats();

    return res.status(200).json({
      success: true,
      changes: {
        newEpic: changes.newEpic.length,
        newSteam: changes.newSteam.length,
        newPSPlusMonthly: changes.newPSPlus.monthly.length,
        newPSPlusCatalog: changes.newPSPlus.catalog.length,
      },
      messagesSent,
      stats,
    });
  } catch (error) {
    console.error("❌ Помилка перевірки роздач:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
