import { EpicGames } from "../lib/epic-games.js";
import { Steam } from "../lib/steam.js";
import { TelegramBot } from "../lib/telegram.js";
import { SimpleStorage } from "../lib/simple-storage.js";

// Функції форматування ВИНЕСЕНІ ЗОВНІ
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

function formatGiveawayMessage(epicGames, steamGames) {
  const currentDate = new Date().toLocaleDateString("uk-UA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let message = `🎮 <b>БЕЗКОШТОВНІ РОЗДАЧІ ІГОР</b>\n`;
  message += `📅 <i>${currentDate}</i>\n\n`;

  // EPIC GAMES
  const epicActive = epicGames.filter((game) => game.isActive);
  const epicUpcoming = epicGames.filter(
    (game) => !game.isActive && game.startDate
  );

  if (epicActive.length > 0) {
    message += `🎯 <b>EPIC GAMES</b>\n\n`;
    epicActive.forEach((game) => {
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
  }

  // STEAM
  if (steamGames.length > 0) {
    if (epicActive.length > 0) message += `───────────────\n\n`;

    message += `⚡ <b>STEAM</b>\n\n`;
    steamGames.forEach((game) => {
      const priceInfo = game.originalPrice
        ? `💵 <s>${game.originalPrice}</s> <b>БЕЗКОШТОВНО</b>\n`
        : `🎁 <b>БЕЗКОШТОВНО</b>\n`;

      message += `🎮 <b>${game.title}</b>\n`;
      message += priceInfo;
      message += `🔗 <a href="${game.url}">Отримати гру</a>\n\n`;
    });
  }

  // МАЙБУТНІ РОЗДАЧІ (Epic Games)
  if (epicUpcoming.length > 0) {
    message += `───────────────\n\n`;
    message += `📅 <b>МАЙБУТНІ РОЗДАЧІ EPIC GAMES:</b>\n\n`;

    epicUpcoming.sort((a, b) => a.startDate - b.startDate);
    epicUpcoming.forEach((game) => {
      message += `🕒 <b>${game.title}</b>\n`;
      message += `📆 ${game.startDate.toLocaleDateString("uk-UA")}\n\n`;
    });
  }

  message += `🔔 <i>Слідкуйте за оновленнями щодня!</i>`;

  return message;
}

export default async function handler(req, res) {
  try {
    console.log("🔄 Перевіряю нові роздачі...");

    // Ініціалізація
    const epic = new EpicGames();
    const steam = new Steam();
    const storage = new SimpleStorage();
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

    // Якщо немає нових ігор, але є поточні - відправляємо загальне повідомлення
    if (
      messagesSent === 0 &&
      (currentEpicGames.length > 0 || currentSteamGames.length > 0)
    ) {
      console.log("📤 Надсилаю загальне повідомлення про поточні роздачі...");
      const message = formatGiveawayMessage(
        currentEpicGames,
        currentSteamGames
      );
      const success = await telegram.sendMessage(message);
      if (success) {
        messagesSent++;
        console.log("✅ Загальне повідомлення відправлено");
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
