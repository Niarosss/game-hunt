import { EpicGames } from "./lib/epic-games.js";
import { Steam } from "./lib/steam.js";
import { TelegramBot } from "./lib/telegram.js";
import { Storage } from "./lib/storage.js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function testTracking() {
  console.log("🧪 ТЕСТУЄМО СИСТЕМУ ВІДСТЕЖЕННЯ\n");

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.log("❌ TELEGRAM_BOT_TOKEN не знайдено!");
    return;
  }

  try {
    const epic = new EpicGames();
    const steam = new Steam();
    const storage = new Storage();
    const telegram = new TelegramBot(
      process.env.TELEGRAM_BOT_TOKEN,
      process.env.TELEGRAM_CHAT_ID
    );

    // Завантажуємо поточний стан
    const currentState = storage.loadGames();
    console.log("📊 ПОЧАТКОВИЙ СТАН:");
    console.log(`🎯 Epic Games: ${currentState.epic.length} ігор`);
    console.log(`⚡ Steam: ${currentState.steam.length} ігор`);

    // Отримуємо актуальні ігри
    console.log("\n📡 Отримую актуальні роздачі...");
    const [currentEpicGames, currentSteamGames] = await Promise.all([
      epic.getFreeGames(),
      steam.getFreeGames(),
    ]);

    // Перевіряємо зміни
    const changes = storage.updateGames(currentEpicGames, currentSteamGames);

    console.log("\n📊 ЗНАЙДЕНІ ЗМІНИ:");
    console.log(`🆕 Нові Epic Games: ${changes.newEpic.length}`);
    console.log(`🆕 Нові Steam: ${changes.newSteam.length}`);
    console.log(`🔚 Завершилися Epic: ${changes.endedEpic.length}`);
    console.log(`🔚 Завершилися Steam: ${changes.endedSteam.length}`);

    // Тестуємо відправку повідомлень
    if (process.env.TELEGRAM_CHAT_ID) {
      // Нові Epic Games
      if (changes.newEpic.length > 0) {
        const activeNew = changes.newEpic.filter((game) => game.isActive);
        if (activeNew.length > 0) {
          const message = formatNewGamesMessage(
            activeNew,
            "Epic Games",
            "🆕 ТЕСТ: НОВА РОЗДАЧА!"
          );
          await telegram.sendMessage(message);
          console.log(
            "✅ Тестове повідомлення про нові Epic Games відправлено"
          );
        }
      }

      // Нові Steam
      if (changes.newSteam.length > 0) {
        const message = formatNewGamesMessage(
          changes.newSteam,
          "Steam",
          "🆕 ТЕСТ: НОВА РОЗДАЧА!"
        );
        await telegram.sendMessage(message);
        console.log("✅ Тестове повідомлення про нові Steam відправлено");
      }

      // Завершені роздачі
      if (changes.endedEpic.length > 0 || changes.endedSteam.length > 0) {
        const message = formatEndedGamesMessage(
          changes.endedEpic,
          changes.endedSteam
        );
        await telegram.sendMessage(message);
        console.log(
          "✅ Тестове повідомлення про завершені роздачі відправлено"
        );
      }

      if (
        changes.newEpic.length === 0 &&
        changes.newSteam.length === 0 &&
        changes.endedEpic.length === 0 &&
        changes.endedSteam.length === 0
      ) {
        console.log("ℹ️ Змін не знайдено - повідомлення не відправляються");
      }
    }

    // Фінальний стан
    const finalState = storage.loadGames();
    console.log("\n📊 ФІНАЛЬНИЙ СТАН:");
    console.log(`🎯 Epic Games: ${finalState.epic.length} ігор`);
    console.log(`⚡ Steam: ${finalState.steam.length} ігор`);
    console.log(`🕒 Останнє оновлення: ${finalState.lastUpdate}`);
  } catch (error) {
    console.error("❌ Помилка тестування:", error);
  }
}

// Функції форматування (аналогічні до головного файлу)
function formatNewGamesMessage(games, platform, title) {
  let message = `${title}\n`;
  message += `🎮 <b>${platform}</b>\n\n`;

  games.forEach((game) => {
    const priceInfo = game.hasMeaningfulPrice
      ? `💵 <s>${game.originalPrice}</s> <b>БЕЗКОШТОВНО</b>\n`
      : `💵 <b>БЕЗКОШТОВНО</b>\n`;

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

function formatEndedGamesMessage(endedEpic, endedSteam) {
  let message = `🔚 <b>ТЕСТ: РОЗДАЧІ ЗАВЕРШИЛИСЯ</b>\n\n`;

  if (endedEpic.length > 0) {
    message += `🎯 <b>Epic Games:</b>\n`;
    endedEpic.forEach((game) => {
      message += `❌ ${game.title}\n`;
    });
    message += "\n";
  }

  if (endedSteam.length > 0) {
    message += `⚡ <b>Steam:</b>\n`;
    endedSteam.forEach((game) => {
      message += `❌ ${game.title}\n`;
    });
    message += "\n";
  }

  return message;
}

testTracking();
