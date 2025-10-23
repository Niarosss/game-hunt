// test-all-platforms.js
import { EpicGames } from "./lib/epic-games.js";
import { Steam } from "./lib/steam.js";
import { PSPlus } from "./lib/ps-plus.js";

async function testAllPlatforms() {
  console.log("🧪 ТЕСТУВАННЯ ВСІХ ПЛАТФОРМ (без БД)\n");

  try {
    // Ініціалізація
    const epic = new EpicGames();
    const steam = new Steam();
    const psPlus = new PSPlus();

    console.log("🔄 Завантажую ігри з усіх платформ...\n");

    // Тестуємо Epic Games
    console.log("🎯 ТЕСТ EPIC GAMES:");
    console.log("───────────────────");
    try {
      const epicGames = await epic.getFreeGames();
      const activeEpic = epicGames.filter((g) => g.isActive);
      const upcomingEpic = epicGames.filter((g) => !g.isActive && g.startDate);

      console.log(`✅ Знайдено ігор: ${epicGames.length}`);
      console.log(`🎮 Активних: ${activeEpic.length}`);
      console.log(`📅 Майбутніх: ${upcomingEpic.length}`);

      if (activeEpic.length > 0) {
        console.log("\n📋 Активні ігри:");
        activeEpic.forEach((game, index) => {
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
        console.log("ℹ️ Активних ігор не знайдено");
      }
    } catch (error) {
      console.log(`❌ Помилка Epic Games: ${error.message}`);
    }

    console.log("\n⚡ ТЕСТ STEAM:");
    console.log("──────────────");
    try {
      const steamGames = await steam.getFreeGames();
      console.log(`✅ Знайдено ігор: ${steamGames.length}`);

      if (steamGames.length > 0) {
        console.log("\n📋 Ігри Steam:");
        steamGames.slice(0, 3).forEach((game, index) => {
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
        if (steamGames.length > 3) {
          console.log(`  ... і ще ${steamGames.length - 3} ігор`);
        }
      } else {
        console.log("ℹ️ Ігор Steam не знайдено");
      }
    } catch (error) {
      console.log(`❌ Помилка Steam: ${error.message}`);
    }

    console.log("\n🎮 ТЕСТ PS PLUS:");
    console.log("────────────────");
    try {
      const psPlusGames = await psPlus.getAllGames();
      console.log(`✅ Місячних ігор: ${psPlusGames.monthly.length}`);
      console.log(`✅ Ігор в каталозі: ${psPlusGames.catalog.length}`);
      console.log(`✅ Всього ігор: ${psPlusGames.all.length}`);

      if (psPlusGames.monthly.length > 0) {
        console.log("\n📋 Місячні ігри:");
        psPlusGames.monthly.forEach((game, index) => {
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
        console.log("ℹ️ Місячних ігор не знайдено");
      }

      if (psPlusGames.catalog.length > 0) {
        console.log("\n📋 Ігри каталогу:");
        psPlusGames.catalog.slice(0, 5).forEach((game, index) => {
          console.log(`  ${index + 1}. ${game.title}`);
          console.log(`     🏷️  Тип: ${game.type}`);
        });
        if (psPlusGames.catalog.length > 5) {
          console.log(`  ... і ще ${psPlusGames.catalog.length - 5} ігор`);
        }
      } else {
        console.log("ℹ️ Ігор в каталозі не знайдено");
      }
    } catch (error) {
      console.log(`❌ Помилка PS Plus: ${error.message}`);
    }

    // Простий тест "нових" ігор без БД
    console.log("\n📊 СИМУЛЯЦІЯ НОВИХ ІГОР:");
    console.log("──────────────────────");
    console.log(
      "💡 Уявімо, що всі знайдені ігри - нові (бо БД не використовується)"
    );
    console.log(
      `🆕 Нові Epic Games: ~${
        epicGames ? epicGames.filter((g) => g.isActive).length : 0
      }`
    );
    console.log(`🆕 Нові Steam: ~${steamGames ? steamGames.length : 0}`);
    console.log(
      `🆕 Нові PS Plus Monthly: ~${
        psPlusGames ? psPlusGames.monthly.length : 0
      }`
    );
    console.log(
      `🆕 Нові PS Plus Catalog: ~${
        psPlusGames ? psPlusGames.catalog.length : 0
      }`
    );

    console.log("\n🎉 ТЕСТУВАННЯ ЗАВЕРШЕНО!");
    console.log(
      "💡 База даних не використовувалась - тільки перевірка парсерів"
    );
  } catch (error) {
    console.error("💥 КРИТИЧНА ПОМИЛКА:", error);
  }
}

// Тест форматування повідомлень
function testMessageFormatting() {
  console.log("\n📝 ТЕСТ ФОРМАТУВАННЯ ПОВІДОМЛЕНЬ:");
  console.log("─────────────────────────────────");

  function formatEpicMessage(games) {
    let message = `🎮 <b>EPIC GAMES</b>\n\n`;
    games.forEach((game, index) => {
      const priceInfo = game.hasMeaningfulPrice
        ? `💵 <s>${game.originalPrice}</s> <b>БЕЗКОШТОВНО</b>\n`
        : `🎁 <b>БЕЗКОШТОВНО</b>\n`;

      const endDate = game.endDate
        ? `⏰ До: <b>${new Date(game.endDate).toLocaleDateString(
            "uk-UA"
          )}</b>\n`
        : "";

      message += `${index + 1}. <b>${game.title}</b>\n${priceInfo}${endDate}`;
      message += `🔗 <a href="${game.url}">Отримати гру</a>\n\n`;
    });
    return message;
  }

  function formatPSPlusMessage(monthlyGames, catalogGames) {
    let message = `🎮 <b>НОВІ ІГРИ PS PLUS</b>\n\n`;

    if (monthlyGames.length > 0) {
      message += `🎯 <b>МІСЯЧНІ ІГРИ:</b>\n\n`;
      monthlyGames.forEach((game, index) => {
        const endDate = game.endDate
          ? `⏰ До: <b>${new Date(game.endDate).toLocaleDateString(
              "uk-UA"
            )}</b>\n`
          : "";

        message += `${index + 1}. <b>${game.title}</b>\n`;
        message += `🎁 <b>Включено в PS Plus</b>\n${endDate}`;
        message += `🔗 <a href="${game.url}">Детальніше</a>\n\n`;
      });
    }

    if (catalogGames.length > 0) {
      message += `📚 <b>ІГРИ В КАТАЛОЗІ:</b>\n\n`;
      catalogGames.forEach((game, index) => {
        message += `${index + 1}. <b>${game.title}</b>\n`;
        message += `🎁 <b>Включено в PS Plus Extra/Premium</b>\n`;
        message += `🔗 <a href="${game.url}">Детальніше</a>\n\n`;
      });
    }

    return message;
  }

  // Тестові дані
  const testEpicGames = [
    {
      title: "Test Epic Game",
      hasMeaningfulPrice: true,
      originalPrice: "₴499",
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      url: "https://store.epicgames.com/test",
      isActive: true,
    },
  ];

  const testPSPlusGames = {
    monthly: [
      {
        title: "Alan Wake 2 | PS5",
        url: "https://blog.playstation.com/test",
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        type: "monthly",
      },
    ],
    catalog: [
      {
        title: "Silent Hill 2 | PS5",
        url: "https://blog.playstation.com/test",
        type: "catalog",
      },
    ],
  };

  console.log("\n📨 Epic Games повідомлення:");
  console.log("─────────────────────────");
  console.log(formatEpicMessage(testEpicGames));

  console.log("\n📨 PS Plus повідомлення:");
  console.log("───────────────────────");
  console.log(
    formatPSPlusMessage(testPSPlusGames.monthly, testPSPlusGames.catalog)
  );
}

// Головна функція запуску
async function main() {
  console.log("🚀 ЗАПУСК КОМПЛЕКСНОГО ТЕСТУ (без БД)");
  console.log("=====================================\n");

  await testAllPlatforms();
  testMessageFormatting();

  console.log("\n✅ ВСІ ТЕСТИ ЗАВЕРШЕНІ");
  console.log(
    "📋 Перевірено: Epic Games, Steam, PS Plus, форматування повідомлень"
  );
}

// Запускаємо напряму
main().catch((error) => {
  console.error("💥 Помилка під час тестування:", error);
  process.exit(1);
});
