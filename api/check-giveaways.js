import { EpicGames } from "../lib/epic-games.js";
import { Steam } from "../lib/steam.js";
import { PSPlus } from "../lib/ps-plus.js";
import { TelegramBot } from "../lib/telegram.js";
import { Storage } from "../lib/storage.js";

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
        psPlus.getAllGames().catch((error) => {
          console.log("❌ Помилка отримання PS Plus ігор:", error.message);
          return {
            monthly: { games: [], article: null },
            catalog: { games: [], article: null },
            all: [],
          };
        }),
      ]);

    // Гарантуємо правильну структуру для PS Plus
    const safePSPlusGames = {
      monthly: {
        games: psPlusGames?.monthly?.games || [],
        article: psPlusGames?.monthly?.article || null,
      },
      catalog: {
        games: psPlusGames?.catalog?.games || [],
        article: psPlusGames?.catalog?.article || null,
      },
      all: psPlusGames?.all || [],
    };

    // В оновленні даних:
    const changes = await storage.updateGames(
      currentEpicGames,
      currentSteamGames,
      safePSPlusGames
    );

    console.log("\n📊 ЗМІНИ:");
    console.log(`🆕 Нові Epic Games: ${changes.newEpic.length}`);
    console.log(`🆕 Нові Steam: ${changes.newSteam.length}`);
    console.log(
      `🆕 Нові PS Plus Monthly: ${changes.newPSPlus?.monthly?.length || 0}`
    );
    console.log(
      `🆕 Нові PS Plus Catalog: ${changes.newPSPlus?.catalog?.length || 0}`
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
      console.log("📤 Надсилаю повідomлення про нові Steam...");
      if (await telegram.sendNewSteamGames(changes.newSteam)) {
        messagesSent++;
        console.log("✅ Повідомлення Steam відправлено");
      }
    }

    // PS Plus - розділяємо повідомлення
    const newMonthly = changes.newPSPlus?.monthly?.games || [];
    const newCatalog = changes.newPSPlus?.catalog?.games || [];
    const monthlyArticle = safePSPlusGames.monthly.article;
    const catalogArticle = safePSPlusGames.catalog.article;

    // Місячні ігри - окреме повідомлення
    if (newMonthly.length > 0) {
      console.log("📤 Надсилаю повідомлення про нові місячні ігри PS Plus...");
      if (await telegram.sendPSPlusMonthly(newMonthly, monthlyArticle)) {
        messagesSent++;
        console.log("✅ Повідомлення про місячні ігри PS Plus відправлено");
      }
    }

    // Ігри каталогу - окреме повідомлення
    if (newCatalog.length > 0) {
      console.log(
        "📤 Надсилаю повідомлення про нові ігри в каталозі PS Plus..."
      );
      if (await telegram.sendPSPlusCatalog(newCatalog, catalogArticle)) {
        messagesSent++;
        console.log("✅ Повідомлення про ігри каталогу PS Plus відправлено");
      }
    }

    if (messagesSent === 0) console.log("ℹ️ Нових роздач не знайдено");

    const stats = await storage.getStats();

    return res.status(200).json({
      success: true,
      changes: {
        newEpic: changes.newEpic.length,
        newSteam: changes.newSteam.length,
        newPSPlusMonthly: newMonthly.length,
        newPSPlusCatalog: newCatalog.length,
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
