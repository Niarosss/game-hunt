// test-all-platforms.js
import { EpicGames } from "./lib/epic-games.js";
import { Steam } from "./lib/steam.js";
import { PSPlus } from "./lib/ps-plus.js";
import { Storage } from "./lib/storage.js";
import { TelegramBot } from "./lib/telegram.js";

async function testAllPlatforms() {
  console.log("🧪 ТЕСТУВАННЯ ВСІХ ПЛАТФОРМ (з порівнянням даних)\n");

  try {
    const epic = new EpicGames();
    const steam = new Steam();
    const psPlus = new PSPlus();
    const storage = new Storage();

    const telegram = new TelegramBot("test-token", "test-chat-id");

    console.log("📁 Завантажую наявні дані з сховища...");
    const existing = await storage.loadGames();

    const safeExisting = {
      epic: existing.epic || [],
      steam: existing.steam || [],
      psPlus: {
        monthly: {
          games: existing.psPlus?.monthly?.games || [],
        },
        catalog: {
          games: existing.psPlus?.catalog?.games || [],
        },
      },
    };

    console.log(
      `📊 Наявно: Epic ${safeExisting.epic.length}, Steam ${
        safeExisting.steam.length
      }, PS Plus ${
        safeExisting.psPlus.monthly.games.length +
        safeExisting.psPlus.catalog.games.length
      }`
    );

    console.log("\n🔄 Завантажую нові дані з платформ...\n");

    const tasks = [
      { key: "epic", task: epic.getFreeGames() },
      { key: "steam", task: steam.getFreeGames() },
      { key: "psPlus", task: psPlus.getAllGames() },
    ];

    const results = await Promise.allSettled(tasks.map((t) => t.task));

    const data = {
      epic: [],
      steam: [],
      psPlus: {
        monthly: { games: [], article: null },
        catalog: { games: [], article: null },
        all: [],
      },
    };

    results.forEach((res, i) => {
      const key = tasks[i].key;

      if (res.status === "fulfilled") {
        if (key === "psPlus") {
          data.psPlus = {
            monthly: res.value?.monthly || { games: [], article: null },
            catalog: res.value?.catalog || { games: [], article: null },
            all: res.value?.all || [],
          };
        } else {
          data[key] = Array.isArray(res.value) ? res.value : [];
        }
        return;
      }

      console.log(`❌ Помилка ${key}: ${res.reason.message}`);
    });

    // -----------------------------------------
    // EPIC
    // -----------------------------------------
    console.log("\n🎯 ТЕСТ EPIC GAMES:\n───────────────────");

    const existingEpicIds = new Set(safeExisting.epic.map((g) => g.id));
    const newEpic = data.epic.filter((g) => !existingEpicIds.has(g.id));

    console.log(`🆕 Нових ігор: ${newEpic.length}`);

    if (newEpic.length > 0) {
      newEpic.forEach((g, i) => {
        console.log(`  ${i + 1}. ${g.title}`);
        console.log(
          `     💵 ${
            g.originalPrice ? `${g.originalPrice} → БЕЗКОШТОВНО` : "БЕЗКОШТОВНО"
          }`
        );
        console.log(
          `     ⏰ ${
            g.endDate ? new Date(g.endDate).toLocaleDateString("uk-UA") : "N/A"
          }`
        );
      });
    }

    // -----------------------------------------
    // STEAM
    // -----------------------------------------
    console.log("\n⚡ ТЕСТ STEAM:\n──────────────");

    const existingSteamIds = new Set(safeExisting.steam.map((g) => g.id));
    const newSteam = data.steam.filter((g) => !existingSteamIds.has(g.id));

    console.log(`🆕 Нових ігор: ${newSteam.length}`);

    if (newSteam.length > 0) {
      newSteam.slice(0, 3).forEach((g, i) => {
        console.log(`  ${i + 1}. ${g.title}`);
        if (g.originalPrice && g.originalPrice !== "0") {
          console.log(`     💵 <s>${g.originalPrice}</s>`);
        }
        console.log(`     🔗 ${g.url}`);
      });

      if (newSteam.length > 3) {
        console.log(`  ... і ще ${newSteam.length - 3} ігор`);
      }
    }

    // -----------------------------------------
    // PS PLUS
    // -----------------------------------------
    console.log("\n🎮 ТЕСТ PS PLUS:\n────────────────");

    const ps = data.psPlus;

    console.log(`✅ Місячні: ${ps.monthly.games.length}`);
    console.log(`✅ Каталог: ${ps.catalog.games.length}`);
    console.log(`📰 Місячна стаття: ${ps.monthly.article?.title || "немає"}`);
    console.log(`🖼️ Зображення: ${ps.monthly.article?.imageUrl || "немає"}`);
    console.log(`📰 Каталог стаття: ${ps.catalog.article?.title || "немає"}`);
    console.log(`🖼️ Зображення: ${ps.catalog.article?.imageUrl || "немає"}`);

    const existingMonthly = new Set(
      safeExisting.psPlus.monthly.games.map((g) => g.title)
    );
    const newMonthly = ps.monthly.games.filter(
      (g) => !existingMonthly.has(g.title)
    );

    const existingCatalog = new Set(
      safeExisting.psPlus.catalog.games.map((g) => g.title)
    );
    const newCatalog = ps.catalog.games.filter(
      (g) => !existingCatalog.has(g.title)
    );

    console.log(`🆕 Місячні: ${newMonthly.length}`);
    console.log(`🆕 Каталог: ${newCatalog.length}`);

    if (newMonthly.length > 0) {
      console.log("\n📋 Нові місячні:");
      newMonthly.forEach((g, i) => {
        console.log(`  ${i + 1}. ${g.title}`);
        console.log(`     🏷️ ${g.type}`);
        console.log(
          `     ⏰ ${
            g.endDate ? new Date(g.endDate).toLocaleDateString("uk-UA") : "N/A"
          }`
        );
      });
    }

    if (newCatalog.length > 0) {
      console.log("\n📋 Новий каталог:");
      newCatalog.slice(0, 5).forEach((g, i) => {
        console.log(`  ${i + 1}. ${g.title}`);
        console.log(`     🏷️ ${g.type}`);
      });
      if (newCatalog.length > 5) {
        console.log(`  ... і ще ${newCatalog.length - 5} ігор`);
      }
    }

    // -----------------------------------------
    // UPDATE STORAGE
    // -----------------------------------------
    console.log("\n💾 ОНОВЛЕННЯ СХОВИЩА:\n────────────────────");

    const changes = await storage.updateGames(
      data.epic,
      data.steam,
      data.psPlus
    );

    console.log("✅ Збережено в data/games.json");
    console.log(`🆕 Epic: ${changes.newEpic.length}`);
    console.log(`🆕 Steam: ${changes.newSteam.length}`);
    console.log(
      `🆕 PS Monthly: ${changes.newPSPlus?.monthly?.games.length || 0}`
    );
    console.log(
      `🆕 PS Catalog: ${changes.newPSPlus?.catalog?.games.length || 0}`
    );

    const stats = await storage.getStats();
    console.log("\n📊 СТАТИСТИКА:");
    console.log(`📁 Epic: ${stats.totalEpic}`);
    console.log(`📁 Steam: ${stats.totalSteam}`);
    console.log(`📁 PS Monthly: ${stats.totalPSPlusMonthly}`);
    console.log(`📁 PS Catalog: ${stats.totalPSPlusCatalog}`);
    console.log(
      `🕐 Останнє оновлення: ${
        stats.lastUpdate
          ? new Date(stats.lastUpdate).toLocaleString("uk-UA")
          : "Ніколи"
      }`
    );

    // -----------------------------------------
    // FORMAT MESSAGES
    // -----------------------------------------
    console.log("\n📝 ТЕСТ ФОРМАТУВАННЯ:\n────────────────────");

    const msgEpic = newEpic.filter((g) => g.isActive).slice(0, 2);
    const msgSteam = newSteam.slice(0, 2);
    const msgMonthly = newMonthly;
    const msgCatalog = newCatalog.slice(0, 3);

    if (msgEpic.length > 0) {
      console.log("\n📨 Epic:");
      console.log(
        telegram.formatGamesMessage({ source: "epic", games: msgEpic })
      );
    }

    if (msgSteam.length > 0) {
      console.log("\n📨 Steam:");
      console.log(
        telegram.formatGamesMessage({ source: "steam", games: msgSteam })
      );
    }

    if (msgMonthly.length > 0) {
      console.log("\n📨 PS Plus Monthly:");
      console.log(
        telegram.formatGamesMessage({
          source: "psPlusMonthly",
          games: msgMonthly,
          article: ps.monthly.article,
        })
      );
    }

    if (msgCatalog.length > 0) {
      console.log("\n📨 PS Plus Catalog:");
      console.log(
        telegram.formatGamesMessage({
          source: "psPlusCatalog",
          games: msgCatalog,
          article: ps.catalog.article,
        })
      );
    }

    console.log("\n🎉 Тест завершено. Оновлено data/games.json.\n");
  } catch (err) {
    console.error("💥 КРИТИЧНА ПОМИЛКА:", err);
  }
}

async function main() {
  console.log("🚀 ЗАПУСК КОМПЛЕКСНОГО ТЕСТУ\n============================\n");

  process.env.VERCEL_ENV = "development";

  await testAllPlatforms();

  console.log("\n✅ ВСІ ТЕСТИ ЗАВЕРШЕНО");
}

main().catch((e) => {
  console.error("💥 Помилка під час тестування:", e);
  process.exit(1);
});
