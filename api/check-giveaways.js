import { EpicGames } from "../lib/epic-games.js";
import { Steam } from "../lib/steam.js";
import { TelegramBot } from "../lib/telegram.js";
import { Storage } from "../lib/storage.js";

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

    // Отримуємо поточні ігри
    const [currentEpicGames, currentSteamGames] = await Promise.all([
      epic.getFreeGames(),
      steam.getFreeGames(),
    ]);

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
      console.log("\n📤 Надсилаю повідомлення про нові ігри Epic Games...");

      const activeNewEpic = changes.newEpic.filter((game) => game.isActive);
      const upcomingNewEpic = changes.newEpic.filter((game) => !game.isActive);

      if (activeNewEpic.length > 0) {
        const message = this.formatNewGamesMessage(
          activeNewEpic,
          "Epic Games",
          "🆕 НОВА РОЗДАЧА!"
        );
        const success = await telegram.sendMessage(message);
        if (success) {
          messagesSent++;
          await new Promise((resolve) => setTimeout(resolve, 2000)); // Затримка
        }
      }

      if (upcomingNewEpic.length > 0) {
        const message = this.formatUpcomingGamesMessage(
          upcomingNewEpic,
          "Epic Games"
        );
        const success = await telegram.sendMessage(message);
        if (success) {
          messagesSent++;
          await new Promise((resolve) => setTimeout(resolve, 2000)); // Затримка
        }
      }
    }

    // Надсилаємо повідомлення про нові ігри Steam
    if (changes.newSteam.length > 0) {
      console.log("\n📤 Надсилаю повідомлення про нові ігри Steam...");

      const message = this.formatNewGamesMessage(
        changes.newSteam,
        "Steam",
        "🆕 НОВА РОЗДАЧА!"
      );
      const success = await telegram.sendMessage(message);
      if (success) {
        messagesSent++;
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Затримка
      }
    }

    // Надсилаємо повідомлення про завершені роздачі
    if (changes.endedEpic.length > 0 || changes.endedSteam.length > 0) {
      console.log("\n📤 Надсилаю повідомлення про завершені роздачі...");

      const message = this.formatEndedGamesMessage(
        changes.endedEpic,
        changes.endedSteam
      );
      const success = await telegram.sendMessage(message);
      if (success) {
        messagesSent++;
      }
    }

    // Якщо немає змін, відправляємо статус
    if (messagesSent === 0) {
      console.log("ℹ️ Нових роздач не знайдено");

      // Можна додати опціональне повідомлення про статус
      if (process.env.SEND_STATUS_MESSAGES === "true") {
        const stats = storage.getStats();
        const statusMessage = `📊 Статус: ${
          stats.totalEpic
        } ігор в Epic Games, ${
          stats.totalSteam
        } в Steam\n🕒 Останнє оновлення: ${new Date().toLocaleString("uk-UA")}`;
        await telegram.sendMessage(statusMessage);
      }
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

// Форматуємо повідомлення про нові ігри
function formatNewGamesMessage(games, platform, title) {
  let message = `${title}\n`;
  message += `🎮 <b>${platform}</b>\n\n`;

  games.forEach((game) => {
    const priceInfo = game.hasMeaningfulPrice
      ? `💵 <s>${game.originalPrice}</s> <b>БЕЗКОШТОВНО</b>\n`
      : "🎁 <b>БЕЗКОШТОВНА РОЗДАЧА</b>\n";

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

// Форматуємо повідомлення про майбутні ігри
function formatUpcomingGamesMessage(games, platform) {
  let message = `📅 <b>НОВА МАЙБУТНЯ РОЗДАЧА!</b>\n`;
  message += `🎮 <b>${platform}</b>\n\n`;

  games.forEach((game) => {
    message += `🕒 <b>${game.title}</b>\n`;
    message += `📆 Початок: <b>${game.startDate.toLocaleDateString(
      "uk-UA"
    )}</b>\n`;
    message += `⏰ Кінець: <b>${game.endDate.toLocaleDateString(
      "uk-UA"
    )}</b>\n\n`;
  });

  return message;
}

// Форматуємо повідомлення про завершені роздачі
function formatEndedGamesMessage(endedEpic, endedSteam) {
  let message = `🔚 <b>РОЗДАЧІ ЗАВЕРШИЛИСЯ</b>\n\n`;

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

  message += `💫 <i>Дякуємо, що встигли отримати!</i>`;

  return message;
}
