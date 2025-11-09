import { EpicGames } from "../lib/epic-games.js";
import { Steam } from "../lib/steam.js";
import { PSPlus } from "../lib/ps-plus.js";
import { TelegramBot } from "../lib/telegram.js";
import { Storage } from "../lib/storage.js";

export default async function handler(req, res) {
  try {
    console.log("🔄 Перевіряю нові роздачі...");

    // Перевірка змінних середовища
    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
      console.log("❌ Відсутні змінні середовища");
      return res.status(500).json({
        success: false,
        error: "Відсутні TELEGRAM_BOT_TOKEN або TELEGRAM_CHAT_ID",
      });
    }

    console.log("✅ Змінні середовища налаштовані");

    // Ініціалізація
    const epic = new EpicGames();
    const steam = new Steam();
    const psPlus = new PSPlus();
    const storage = new Storage();
    const telegram = new TelegramBot(
      process.env.TELEGRAM_BOT_TOKEN,
      process.env.TELEGRAM_CHAT_ID
    );

    // Отримання ігор з усіх платформ
    const [currentEpicGames, currentSteamGames, psPlusGamesResult] =
      await Promise.allSettled([
        epic.getFreeGames(),
        steam.getFreeGames(),
        psPlus.getAllGames(),
      ]).then((results) => {
        // Обробка результатів з помилками
        return results.map((result, index) => {
          if (result.status === "rejected") {
            const platform = ["Epic Games", "Steam", "PS Plus"][index];
            console.log(
              `❌ Помилка отримання ${platform} ігор:`,
              result.reason.message
            );
            // Для PS Plus, якщо помилка, повертаємо структуру, яку очікує safePSPlusGames
            if (platform === "PS Plus") {
              return {
                monthly: { games: [], article: null },
                catalog: { games: [], article: null },
                all: [],
              };
            }
            return { games: [], article: null };
          }
          return result.value;
        });
      });

    // Додайте це логування, щоб побачити сирі дані від PS Plus
    console.log(
      "\n🔍 Сирі дані PS Plus від psPlus.getAllGames():",
      JSON.stringify(psPlusGamesResult, null, 2)
    );

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

    // Додайте це логування, щоб побачити, що передається в storage.updateGames
    console.log(
      "\n🔍 safePSPlusGames перед storage.updateGames():",
      JSON.stringify(safePSPlusGames, null, 2)
    );

    // Оновлення даних
    const changes = await storage.updateGames(
      currentEpicGames.games || currentEpicGames,
      currentSteamGames.games || currentSteamGames,
      safePSPlusGames
    );

    // Додайте це логування, щоб побачити повний об'єкт змін
    console.log(
      "\n🔍 Повний об'єкт змін (changes):",
      JSON.stringify(changes, null, 2)
    );

    console.log("\n📊 ЗМІНИ:");
    console.log(`🆕 Нові Epic Games: ${changes.newEpic.length}`);
    console.log(`🆕 Нові Steam: ${changes.newSteam.length}`);
    console.log(
      `🆕 Нові PS Plus Monthly: ${
        changes.newPSPlus?.monthly?.games?.length || 0
      }` // ВИПРАВЛЕНО
    );
    console.log(
      `🆕 Нові PS Plus Catalog: ${
        changes.newPSPlus?.catalog?.games?.length || 0
      }` // ВИПРАВЛЕНО
    );

    let messagesSent = 0;

    // Epic Games
    if (changes.newEpic.length > 0) {
      console.log("📤 Надсилаю повідомлення про нові Epic Games...");
      const activeNewEpic = changes.newEpic.filter((g) => g.isActive);
      if (activeNewEpic.length > 0) {
        if (await telegram.sendNewEpicGames(activeNewEpic)) {
          messagesSent++;
          console.log("✅ Повідомлення Epic Games відправлено");
        }
      }
    }

    // Steam
    if (changes.newSteam.length > 0) {
      console.log("📤 Надсилаю повідомлення про нові Steam ігри...");
      if (await telegram.sendNewSteamGames(changes.newSteam)) {
        messagesSent++;
        console.log("✅ Повідомлення Steam відправлено");
      }
    }

    // PS Plus - розділяємо повідомлення
    const newMonthlyGames = changes.newPSPlus?.monthly?.games || []; // ВИПРАВЛЕНО: отримуємо масив ігор
    const newCatalogGames = changes.newPSPlus?.catalog?.games || []; // ВИПРАВЛЕНО: отримуємо масив ігор
    const monthlyArticle = changes.newPSPlus?.monthly?.article || null; // ВИПРАВЛЕНО: отримуємо статтю з changes
    const catalogArticle = changes.newPSPlus?.catalog?.article || null; // ВИПРАВЛЕНО: отримуємо статтю з changes

    // Місячні ігри - окреме повідомлення
    if (newMonthlyGames.length > 0) {
      // ВИПРАВЛЕНО: перевіряємо довжину масиву ігор
      console.log("📤 Надсилаю повідомлення про нові місячні ігри PS Plus...");
      if (await telegram.sendPSPlusMonthly(newMonthlyGames, monthlyArticle)) {
        // ВИПРАВЛЕНО: передаємо масив ігор
        messagesSent++;
        console.log("✅ Повідомлення про місячні ігри PS Plus відправлено");
      }
    }

    // Ігри каталогу - окреме повідомлення
    if (newCatalogGames.length > 0) {
      // ВИПРАВЛЕНО: перевіряємо довжину масиву ігор
      console.log(
        "📤 Надсилаю повідомлення про нові ігри в каталозі PS Plus..."
      );
      if (await telegram.sendPSPlusCatalog(newCatalogGames, catalogArticle)) {
        // ВИПРАВЛЕНО: передаємо масив ігор
        messagesSent++;
        console.log("✅ Повідомлення про ігри каталогу PS Plus відправлено");
      }
    }

    if (messagesSent === 0) {
      console.log("ℹ️ Нових роздач не знайдено");
    }

    const stats = await storage.getStats();

    return res.status(200).json({
      success: true,
      changes: {
        newEpic: changes.newEpic.length,
        newSteam: changes.newSteam.length,
        newPSPlusMonthly: newMonthlyGames.length, // ВИПРАВЛЕНО
        newPSPlusCatalog: newCatalogGames.length, // ВИПРАВЛЕНО
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
