import { EpicGames } from "../lib/epic-games.js";
import { Steam } from "../lib/steam.js";
import { PSPlus } from "../lib/ps-plus.js";
import { TelegramBot } from "../lib/telegram.js";
import { Storage } from "../lib/storage.js";
import settings from "../config/settings.js";

export default async function handler(req, res) {
  try {
    console.log("🔄 Перевіряю нові роздачі...");

    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
      console.log("❌ Відсутні змінні середовища");
      return res.status(500).json({
        success: false,
        error: "Відсутні TELEGRAM_BOT_TOKEN або TELEGRAM_CHAT_ID",
      });
    }

    const storage = new Storage();
    const telegram = new TelegramBot(
      process.env.TELEGRAM_BOT_TOKEN,
      process.env.TELEGRAM_CHAT_ID,
      settings.telegram
    );

    const tasks = [
      settings.modules.epic
        ? new EpicGames().getFreeGames()
        : Promise.resolve({ games: [] }),
      settings.modules.steam
        ? new Steam().getFreeGames()
        : Promise.resolve({ games: [] }),
      settings.modules.psPlus
        ? new PSPlus().getAllGames()
        : Promise.resolve({
            monthly: { games: [], article: null },
            catalog: { games: [], article: null },
            all: [],
          }),
    ];

    // Отримання ігор з увімкнених платформ
    const [currentEpicGames, currentSteamGames, psPlusGamesResult] =
      await Promise.allSettled(tasks).then((results) => {
        return results.map((result, index) => {
          if (result.status === "rejected") {
            const platform = ["Epic Games", "Steam", "PS Plus"][index];
            console.log(
              `❌ Помилка отримання ${platform} ігор:`,
              result.reason.message
            );
            if (platform === "PS Plus") {
              return {
                monthly: { games: [], article: null },
                catalog: { games: [], article: null },
                all: [],
              };
            }
            return { games: [] };
          }
          return result.value;
        });
      });

    // Гарантуємо правильну структуру для PS Plus
    const safePSPlusGames = {
      monthly: {
        games: psPlusGamesResult?.monthly?.games || [],
        article: psPlusGamesResult?.monthly?.article || null,
      },
      catalog: {
        games: psPlusGamesResult?.catalog?.games || [],
        article: psPlusGamesResult?.catalog?.article || null,
      },
      all: psPlusGamesResult?.all || [],
    };

    // Оновлення даних
    const changes = await storage.updateGames(
      currentEpicGames.games || currentEpicGames,
      currentSteamGames.games || currentSteamGames,
      safePSPlusGames
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
        if (await telegram.sendNewEpicGames(activeNewEpic)) {
          messagesSent++;
        }
      }
    }

    // Steam
    if (settings.modules.steam && changes.newSteam.length > 0) {
      if (await telegram.sendNewSteamGames(changes.newSteam)) {
        messagesSent++;
      }
    }

    // PS Plus
    if (settings.modules.psPlus) {
      const newMonthlyGames = changes.newPSPlus?.monthly?.games || [];
      const newCatalogGames = changes.newPSPlus?.catalog?.games || [];
      const monthlyArticle = changes.newPSPlus?.monthly?.article || null;
      const catalogArticle = changes.newPSPlus?.catalog?.article || null;

      if (newMonthlyGames.length > 0) {
        if (await telegram.sendPSPlusMonthly(newMonthlyGames, monthlyArticle)) {
          messagesSent++;
        }
      }

      if (newCatalogGames.length > 0) {
        if (await telegram.sendPSPlusCatalog(newCatalogGames, catalogArticle)) {
          messagesSent++;
        }
      }
    }

    if (messagesSent === 0 && settings.telegram.log) {
      console.log("ℹ️ Нових роздач не знайдено");
    }

    const stats = await storage.getStats();

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
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
