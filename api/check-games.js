import { EpicGames } from "../lib/epic-games.js";
import { Steam } from "../lib/steam.js";
import { PSPlus } from "../lib/ps-plus.js";
import { TelegramBot } from "../lib/telegram.js";
import { Storage } from "../lib/storage.js";
import settings from "../config/settings.js";

export default async function handler(req, res) {
  const { reportChatId } = req.query;
  let reportBot;

  if (reportChatId) {
    reportBot = new TelegramBot(
      process.env.TELEGRAM_BOT_TOKEN,
      reportChatId,
      settings.telegram
    );
  }

  try {
    console.log("🔄 Перевіряю нові роздачі...");

    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
      throw new Error("Відсутні TELEGRAM_BOT_TOKEN або TELEGRAM_CHAT_ID");
    }

    const storage = new Storage();
    const telegram = new TelegramBot(
      process.env.TELEGRAM_BOT_TOKEN,
      process.env.TELEGRAM_CHAT_ID,
      settings.telegram
    );

    const tasks = [];
    if (settings.modules.epic) tasks.push(new EpicGames().getFreeGames());
    if (settings.modules.steam) tasks.push(new Steam().getFreeGames());
    if (settings.modules.psPlus) tasks.push(new PSPlus().getAllGames());

    const results = await Promise.allSettled(tasks);

    const getResult = (platformName) => {
      const index = Object.keys(settings.modules)
        .filter((k) => settings.modules[k])
        .indexOf(platformName);
      if (index === -1) {
        if (platformName === "psPlus")
          return {
            monthly: { games: [], article: null },
            catalog: { games: [], article: null },
            all: [],
          };
        return [];
      }
      const result = results[index];
      if (result.status === "rejected") {
        console.log(
          `❌ Помилка отримання ${platformName} ігор:`,
          result.reason.message
        );
        if (platformName === "psPlus") {
          return {
            monthly: { games: [], article: null },
            catalog: { games: [], article: null },
            all: [],
          };
        }
        return [];
      }
      return result.value;
    };

    const currentEpicGames = settings.modules.epic ? getResult("epic") : [];
    const currentSteamGames = settings.modules.steam ? getResult("steam") : [];
    const psPlusGamesResult = settings.modules.psPlus
      ? getResult("psPlus")
      : {
          monthly: { games: [], article: null },
          catalog: { games: [], article: null },
          all: [],
        };

    // Оновлення даних
    const changes = await storage.updateGames(
      currentEpicGames,
      currentSteamGames,
      psPlusGamesResult
    );

    if (settings.telegram.log) {
      console.log("\n📊 ЗМІНИ:");
      if (settings.modules.epic)
        console.log(`🆕 Нові Epic Games: ${changes.newEpic.length}`);
      if (settings.modules.steam)
        console.log(`🆕 Нові Steam: ${changes.newSteam.length}`);
      if (settings.modules.psPlus) {
        console.log(
          `🆕 Нові PS Plus Monthly: ${
            changes.newPSPlus?.monthly?.games?.length || 0
          }`
        );
        console.log(
          `🆕 Нові PS Plus Catalog: ${
            changes.newPSPlus?.catalog?.games?.length || 0
          }`
        );
      }
    }

    let messagesSent = 0;

    // Epic Games
    if (settings.modules.epic && changes.newEpic.length > 0) {
      const activeNewEpic = changes.newEpic.filter((g) => g.isActive);
      if (activeNewEpic.length > 0) {
        if (
          await telegram.sendGames({ source: "epic", games: activeNewEpic })
        ) {
          messagesSent++;
        }
      }
    }

    // Steam
    if (settings.modules.steam && changes.newSteam.length > 0) {
      if (
        await telegram.sendGames({ source: "steam", games: changes.newSteam })
      ) {
        messagesSent++;
      }
    }

    // PS Plus
    if (settings.modules.psPlus) {
      const newMonthlyGames = changes.newPSPlus?.monthly?.games || [];
      const newCatalogGames = changes.newPSPlus?.catalog?.games || [];

      if (newMonthlyGames.length > 0) {
        if (
          await telegram.sendGames({
            source: "psPlusMonthly",
            games: newMonthlyGames,
            article: changes.newPSPlus.monthly.article,
          })
        ) {
          messagesSent++;
        }
      }

      if (newCatalogGames.length > 0) {
        if (
          await telegram.sendGames({
            source: "psPlusCatalog",
            games: newCatalogGames,
            article: changes.newPSPlus.catalog.article,
          })
        ) {
          messagesSent++;
        }
      }
    }

    if (messagesSent === 0 && settings.telegram.log) {
      console.log("ℹ️ Нових роздач не знайдено");
    }

    const stats = await storage.getStats();

    // Якщо є бот для звіту, відправляємо йому підсумок
    if (reportBot) {
      await reportBot.sendSummaryReport({ changes, messagesSent });
    }

    return res.status(200).json({
      success: true,
      changes: {
        newEpic: changes.newEpic.length,
        newSteam: changes.newSteam.length,
        newPSPlusMonthly: changes.newPSPlus?.monthly?.games?.length || 0,
        newPSPlusCatalog: changes.newPSPlus?.catalog?.games?.length || 0,
      },
      messagesSent,
      stats,
    });
  } catch (error) {
    console.error("❌ Критична помилка перевірки роздач:", error);

    if (reportBot) {
      await reportBot.sendErrorReport(error);
    }

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
