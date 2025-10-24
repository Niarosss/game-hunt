// test-all-platforms.js
import { EpicGames } from "./lib/epic-games.js";
import { Steam } from "./lib/steam.js";
import { PSPlus } from "./lib/ps-plus.js";
import { Storage } from "./lib/storage.js";
import { TelegramBot } from "./lib/telegram.js";

async function testAllPlatforms() {
  console.log("🧪 ТЕСТУВАННЯ ВСІХ ПЛАТФОРМ (з порівнянням даних)\n");

  try {
    // Ініціалізація
    const epic = new EpicGames();
    const steam = new Steam();
    const psPlus = new PSPlus();
    const storage = new Storage();

    // Створюємо TelegramBot з тестовими даними
    const telegram = new TelegramBot("test-token", "test-chat-id");

    console.log("📁 Завантажую наявні дані з сховища...");
    const existingData = await storage.loadGames();
    console.log(
      `📊 Наявно в сховищі: Epic: ${existingData.epic.length}, Steam: ${
        existingData.steam.length
      }, PS Plus: ${
        (existingData.psPlus?.monthly?.games?.length || 0) +
        (existingData.psPlus?.catalog?.games?.length || 0)
      }`
    );

    console.log("\n🔄 Завантажую нові ігри з усіх платформ...\n");

    // Тестуємо Epic Games
    console.log("🎯 ТЕСТ EPIC GAMES:");
    console.log("───────────────────");
    let epicGames = [];
    try {
      epicGames = await epic.getFreeGames();

      // Порівнюємо з наявними
      const existingEpicIds = new Set(existingData.epic.map((g) => g.id));
      const newEpicGames = epicGames.filter((g) => !existingEpicIds.has(g.id));
      console.log(`🆕 Нових ігор: ${newEpicGames.length}`);

      if (newEpicGames.length > 0) {
        console.log("\n📋 Нові Epic Games:");
        newEpicGames.forEach((game, index) => {
          console.log(`  ${index + 1}. ${game.title}`);
          console.log(
            `     💵 Ціна: ${
              game.hasMeaningfulPrice
                ? `${game.originalPrice} → БЕЗКОШТОВНО`
                : "БЕЗКОШТОВНО"
            }`
          );
          console.log(
            `     ⏰ До: ${
              game.endDate
                ? new Date(game.endDate).toLocaleDateString("uk-UA")
                : "Невідомо"
            }`
          );
        });
      } else {
        console.log("ℹ️ Нових Epic Games не знайдено");
      }
    } catch (error) {
      console.log(`❌ Помилка Epic Games: ${error.message}`);
    }

    console.log("\n⚡ ТЕСТ STEAM:");
    console.log("──────────────");
    let steamGames = [];
    try {
      steamGames = await steam.getFreeGames();

      // Порівнюємо з наявними
      const existingSteamIds = new Set(existingData.steam.map((g) => g.id));
      const newSteamGames = steamGames.filter(
        (g) => !existingSteamIds.has(g.id)
      );
      console.log(`🆕 Нових ігор: ${newSteamGames.length}`);

      if (newSteamGames.length > 0) {
        console.log("\n📋 Нові Steam ігри:");
        newSteamGames.slice(0, 3).forEach((game, index) => {
          console.log(`  ${index + 1}. ${game.title}`);
          console.log(
            `     💵 Ціна: ${
              game.originalPrice
                ? `${game.originalPrice} → БЕЗКОШТОВНО`
                : "БЕЗКОШТОВНО"
            }`
          );
          console.log(`     🔗 URL: ${game.url}`);
        });
        if (newSteamGames.length > 3) {
          console.log(`  ... і ще ${newSteamGames.length - 3} ігор`);
        }
      } else {
        console.log("ℹ️ Нових Steam ігор не знайдено");
      }
    } catch (error) {
      console.log(`❌ Помилка Steam: ${error.message}`);
    }

    console.log("\n🎮 ТЕСТ PS PLUS:");
    console.log("────────────────");
    let psPlusData = {
      monthly: { games: [], article: null },
      catalog: { games: [], article: null },
      all: [],
    };
    try {
      psPlusData = await psPlus.getAllGames();
      console.log(
        `✅ Знайдено місячних ігор: ${psPlusData.monthly.games.length}`
      );
      console.log(
        `✅ Знайдено ігор в каталозі: ${psPlusData.catalog.games.length}`
      );
      console.log(
        `📰 Стаття місячних: ${
          psPlusData.monthly.article
            ? psPlusData.monthly.article.title
            : "немає"
        }`
      );
      console.log(
        `📰 Стаття каталогу: ${
          psPlusData.catalog.article
            ? psPlusData.catalog.article.title
            : "немає"
        }`
      );

      // Порівнюємо з наявними
      const existingMonthlyTitles = new Set(
        (existingData.psPlus?.monthly?.games || []).map((g) => g.title)
      );
      const newMonthlyGames = psPlusData.monthly.games.filter(
        (g) => !existingMonthlyTitles.has(g.title)
      );

      const existingCatalogTitles = new Set(
        (existingData.psPlus?.catalog?.games || []).map((g) => g.title)
      );
      const newCatalogGames = psPlusData.catalog.games.filter(
        (g) => !existingCatalogTitles.has(g.title)
      );

      console.log(`🆕 Нових місячних ігор: ${newMonthlyGames.length}`);
      console.log(`🆕 Нових ігор в каталозі: ${newCatalogGames.length}`);

      if (newMonthlyGames.length > 0) {
        console.log("\n📋 Нові місячні ігри:");
        newMonthlyGames.forEach((game, index) => {
          console.log(`  ${index + 1}. ${game.title}`);
          console.log(`     🏷️  Тип: ${game.type}`);
          console.log(
            `     ⏰ До: ${
              game.endDate
                ? new Date(game.endDate).toLocaleDateString("uk-UA")
                : "Невідомо"
            }`
          );
        });
      } else {
        console.log("ℹ️ Нових місячних ігор не знайдено");
      }

      if (newCatalogGames.length > 0) {
        console.log("\n📋 Нові ігри в каталозі:");
        newCatalogGames.slice(0, 5).forEach((game, index) => {
          console.log(`  ${index + 1}. ${game.title}`);
          console.log(`     🏷️  Тип: ${game.type}`);
        });
        if (newCatalogGames.length > 5) {
          console.log(`  ... і ще ${newCatalogGames.length - 5} ігор`);
        }
      } else {
        console.log("ℹ️ Нових ігор в каталозі не знайдено");
      }
    } catch (error) {
      console.log(`❌ Помилка PS Plus: ${error.message}`);
    }

    console.log("\n💾 ТЕСТ СХОВИЩА (оновлення даних):");
    console.log("─────────────────────────────────");
    try {
      // Оновлюємо сховище та отримуємо зміни
      const changes = await storage.updateGames(
        epicGames,
        steamGames,
        psPlusData
      );

      console.log("✅ Дані оновлено в локальному сховищі (data/games.json)");
      console.log(`🆕 Нові Epic Games: ${changes.newEpic.length}`);
      console.log(`🆕 Нові Steam: ${changes.newSteam.length}`);
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

      // Отримуємо оновлену статистику
      const stats = await storage.getStats();
      console.log("\n📊 ОНОВЛЕНА СТАТИСТИКА СХОВИЩА:");
      console.log(`📁 Epic Games: ${stats.totalEpic} ігор`);
      console.log(`📁 Steam: ${stats.totalSteam} ігор`);
      console.log(`📁 PS Plus Monthly: ${stats.totalPSPlusMonthly} ігор`);
      console.log(`📁 PS Plus Catalog: ${stats.totalPSPlusCatalog} ігор`);
      console.log(
        `🕐 Останнє оновлення: ${
          stats.lastUpdate
            ? new Date(stats.lastUpdate).toLocaleString("uk-UA")
            : "Ніколи"
        }`
      );
    } catch (error) {
      console.log(`❌ Помилка сховища: ${error.message}`);
    }

    console.log("\n📝 ТЕСТ ФОРМАТУВАННЯ ПОВІДОМЛЕНЬ ДЛЯ НОВИХ ІГОР:");
    console.log("─────────────────────────────────────────────────");
    try {
      // Тестуємо форматування тільки для нових ігор
      const existingEpicIds = new Set(existingData.epic.map((g) => g.id));
      const newEpicGames = epicGames.filter(
        (g) => !existingEpicIds.has(g.id) && g.isActive
      );

      const existingSteamIds = new Set(existingData.steam.map((g) => g.id));
      const newSteamGames = steamGames.filter(
        (g) => !existingSteamIds.has(g.id)
      );

      const existingMonthlyTitles = new Set(
        (existingData.psPlus?.monthly?.games || []).map((g) => g.title)
      );
      const newMonthlyGames = psPlusData.monthly.games.filter(
        (g) => !existingMonthlyTitles.has(g.title)
      );

      const existingCatalogTitles = new Set(
        (existingData.psPlus?.catalog?.games || []).map((g) => g.title)
      );
      const newCatalogGames = psPlusData.catalog.games.filter(
        (g) => !existingCatalogTitles.has(g.title)
      );

      if (newEpicGames.length > 0) {
        console.log("\n📨 Повідомлення для нових Epic Games:");
        console.log("──────────────────────────────────");
        const epicMessage = telegram.formatNewEpicGamesMessage(
          newEpicGames.slice(0, 2)
        );
        console.log(epicMessage);
      }

      if (newSteamGames.length > 0) {
        console.log("\n📨 Повідомлення для нових Steam ігор:");
        console.log("─────────────────────────────────");
        const steamMessage = telegram.formatNewSteamGamesMessage(
          newSteamGames.slice(0, 2)
        );
        console.log(steamMessage);
      }

      if (newMonthlyGames.length > 0) {
        console.log("\n📨 Повідомлення для нових місячних ігор PS Plus:");
        console.log("───────────────────────────────────────────────");
        const monthlyMessage = telegram.formatPSPlusMonthlyMessage(
          newMonthlyGames,
          psPlusData.monthly.article
        );
        console.log(monthlyMessage);
      }

      if (newCatalogGames.length > 0) {
        console.log("\n📨 Повідомлення для нових ігор каталогу PS Plus:");
        console.log("───────────────────────────────────────────────");
        const catalogMessage = telegram.formatPSPlusCatalogMessage(
          newCatalogGames.slice(0, 3),
          psPlusData.catalog.article
        );
        console.log(catalogMessage);
      }

      if (
        newEpicGames.length === 0 &&
        newSteamGames.length === 0 &&
        newMonthlyGames.length === 0 &&
        newCatalogGames.length === 0
      ) {
        console.log("ℹ️ Немає нових ігор для форматування повідомлень");
      }
    } catch (error) {
      console.log(`❌ Помилка форматування: ${error.message}`);
    }

    console.log("\n🎉 ТЕСТУВАННЯ ЗАВЕРШЕНО!");
    console.log("💡 Всі дані оновлено в data/games.json");
  } catch (error) {
    console.error("💥 КРИТИЧНА ПОМИЛКА:", error);
  }
}

// Головна функція запуску
async function main() {
  console.log("🚀 ЗАПУСК КОМПЛЕКСНОГО ТЕСТУ (з порівнянням даних)");
  console.log("==================================================\n");

  // Встановлюємо локальний режим
  process.env.VERCEL_ENV = "development";

  await testAllPlatforms();

  console.log("\n✅ ВСІ ТЕСТИ ЗАВЕРШЕНІ");
  console.log(
    "📋 Перевірено: порівняння даних, виявлення нових ігор, оновлення сховища"
  );
}

// Запускаємо напряму
main().catch((error) => {
  console.error("💥 Помилка під час тестування:", error);
  process.exit(1);
});
