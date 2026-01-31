process.on("warning", (warning) => {
  if (warning.name === "DeprecationWarning") {
    console.warn("\n--- TRACE DEPRECATION WARNING ---");
    console.warn(warning.stack);
    console.warn("--- END TRACE ---\n");
  }
});
import "dotenv/config";
import { EpicGames } from "../lib/epic-games.js";
import { Steam } from "../lib/steam.js";
import { PSPlus } from "../lib/ps-plus.js";
import { TelegramBot } from "../lib/telegram.js";
import { Storage } from "../lib/storage.js";
import settings from "../config/settings.js";

export default async function handler(req, res) {
  const { reportChatId } = req.query;

  let reportBot =
    reportChatId &&
    new TelegramBot(
      process.env.TELEGRAM_BOT_TOKEN,
      reportChatId,
      settings.telegram,
    );

  try {
    console.log("🔄 Перевіряю нові роздачі...");

    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
      throw new Error("Відсутні TELEGRAM_BOT_TOKEN або TELEGRAM_CHAT_ID");
    }

    const storage = new Storage();
    const telegram = new TelegramBot(
      process.env.TELEGRAM_BOT_TOKEN,
      process.env.TELEGRAM_CHAT_ID,
      settings.telegram,
    );

    const taskDefinitions = [
      settings.modules.epic && {
        key: "epic",
        task: new EpicGames().getFreeGames(),
      },
      settings.modules.steam && {
        key: "steam",
        task: new Steam().getFreeGames(),
      },
      settings.modules.psPlus && {
        key: "psPlus",
        task: new PSPlus().getAllGames(),
      },
    ].filter(Boolean);

    const results = await Promise.allSettled(
      taskDefinitions.map((t) => t.task),
    );

    const platformData = {};

    taskDefinitions.forEach((def, index) => {
      const res = results[index];

      if (res.status === "fulfilled") {
        platformData[def.key] = res.value;
        return;
      }

      console.log(`❌ Помилка ${def.key}:`, res.reason.message);

      if (def.key === "psPlus") {
        platformData.psPlus = {
          monthly: { games: [], article: null },
          catalog: { games: [], article: null },
        };
      } else {
        platformData[def.key] = [];
      }
    });

    const epicGames = platformData.epic || [];
    const steamGames = platformData.steam || [];

    const psPlus = platformData.psPlus || {
      monthly: { games: [], article: null },
      catalog: { games: [], article: null },
    };

    const changes = await storage.updateGames(epicGames, steamGames, psPlus);

    if (settings.telegram.log) {
      console.log("\n📊 ЗМІНИ:");
      if (settings.modules.epic)
        console.log(`🆕 Epic Games: ${changes.newEpic.length}`);
      if (settings.modules.steam)
        console.log(`🆕 Steam: ${changes.newSteam.length}`);
      if (settings.modules.psPlus) {
        console.log(
          `🆕 PS Plus Monthly: ${
            changes.newPSPlus?.monthly?.games?.length || 0
          }`,
        );
        console.log(
          `🆕 PS Plus Catalog: ${
            changes.newPSPlus?.catalog?.games?.length || 0
          }`,
        );
      }
    }

    let messagesSent = 0;

    const sendPlan = [
      settings.modules.epic && {
        source: "epic",
        games: changes.newEpic ?? [],
      },
      settings.modules.steam && {
        source: "steam",
        games: changes.newSteam ?? [],
      },
      settings.modules.psPlus && {
        source: "psPlusMonthly",
        games: changes.newPSPlus?.monthly?.games ?? [],
        article: changes.newPSPlus?.monthly?.article,
      },
      settings.modules.psPlus && {
        source: "psPlusCatalog",
        games: changes.newPSPlus?.catalog?.games ?? [],
        article: changes.newPSPlus?.catalog?.article,
      },
    ].filter(Boolean);

    for (const item of sendPlan) {
      if (item.games.length > 0) {
        const sent = await telegram.sendGames(item);
        if (sent) messagesSent++;
      }
    }

    if (messagesSent === 0 && settings.telegram.log) {
      console.log("ℹ️ Нових роздач не знайдено");
    }

    const stats = await storage.getStats();

    if (reportBot) {
      await reportBot.sendSummaryReport({ changes, messagesSent });
    }

    res.status(200).json({
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
    console.error("❌ Критична помилка:", error);

    if (reportBot) {
      await reportBot.sendErrorReport(error);
    }

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

async function runLocally() {
  console.log("🚀 Запуск у локальному режимі...");

  // Створюємо мінімальні об'єкти req та res
  const mockReq = {
    query: {}, // Можна додати сюди reportChatId для тестів, напр. { reportChatId: 'YOUR_ID' }
  };

  const mockRes = {
    status: (code) => {
      console.log(`\n✅ Завершено зі статусом: ${code}`);
      return mockRes; // Повертаємо себе для ланцюжкових викликів .status().json()
    },
    json: (data) => {
      console.log("📝 Отримана відповідь JSON:");
      console.log(JSON.stringify(data, null, 2));
    },
  };

  try {
    await handler(mockReq, mockRes);
  } catch (e) {
    console.error("💥 Неперехоплена помилка під час локального запуску:", e);
  }
}

// Перевіряємо, чи є цей файл головним модулем, і запускаємо локальну функцію
// Це стандартний спосіб для ES Modules, аналог require.main === module
import { fileURLToPath } from "url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runLocally();
}
