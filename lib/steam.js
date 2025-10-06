import axios from "axios";

export class Steam {
  constructor() {
    this.baseURL = "https://store.steampowered.com";
  }

  async getFreeGames() {
    try {
      // Отримуємо безкоштовні ігри через API з фільтром
      const response = await axios.get(
        `https://store.steampowered.com/api/featuredcategories`
      );

      console.log(`🔍 Steam: отримано дані з API`);

      // Парсимо безкоштовні ігри з API
      const freeGamesFromAPI = this.parseFreeGamesFromAPI(response.data);

      // Додатково парсимо зі сторінки з фільтром free
      const freeGamesFromPage = await this.parseFreeGamesFromPage();

      // Об'єднуємо результати
      const allFreeGames = [...freeGamesFromAPI, ...freeGamesFromPage];

      // Видаляємо дублікати
      const uniqueGames = this.removeDuplicates(allFreeGames);

      console.log(`🎮 Steam: ${uniqueGames.length} безкоштовних ігор`);
      return uniqueGames;
    } catch (error) {
      console.error("❌ Помилка Steam:", error);
      return [];
    }
  }

  async parseFreeGamesFromPage() {
    try {
      // Використовуємо фільтр безкоштовних ігор
      const response = await axios.get(
        `https://store.steampowered.com/search/?sort_by=Released_DESC&maxprice=free&category1=998&specials=1&ndl=1`,
        {
          headers: {
            "Accept-Language": "uk-UA,uk;q=0.9",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        }
      );

      const games = [];
      const html = response.data;

      // Парсимо HTML для знаходження ігор
      const appIds = this.extractAppIds(html);
      console.log(`🔍 Steam: знайдено ${appIds.length} ігор на сторінці`);

      // Отримуємо деталі для кожної гри
      for (const appId of appIds.slice(0, 10)) {
        // Обмежуємо кількість для тесту
        const gameDetails = await this.getGameDetails(appId);
        if (gameDetails) {
          games.push(gameDetails);
        }
        // Затримка щоб не перевантажити Steam
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      return games;
    } catch (error) {
      console.error("❌ Помилка парсингу сторінки Steam:", error);
      return [];
    }
  }

  extractAppIds(html) {
    const appIds = [];
    const regex = /data-ds-appid="(\d+)"/g;
    let match;

    while ((match = regex.exec(html)) !== null) {
      appIds.push(match[1]);
    }

    return [...new Set(appIds)]; // Видаляємо дублікати
  }

  async getGameDetails(appId) {
    try {
      const response = await axios.get(
        `https://store.steampowered.com/api/appdetails?appids=${appId}&l=ukrainian`
      );

      const data = response.data[appId];
      if (data && data.success) {
        const game = data.data;

        // Перевіряємо чи гра безкоштовна
        const isFree =
          game.is_free ||
          (game.price_overview && game.price_overview.final === 0);

        if (isFree) {
          return {
            title: game.name,
            description: game.short_description || "",
            url: `https://store.steampowered.com/app/${appId}`,
            originalPrice: game.price_overview
              ? (game.price_overview.initial / 100).toFixed(0) + "₴"
              : null,
            startDate: new Date(),
            endDate: null, // Steam роздачи часто постійні
            image:
              game.header_image ||
              `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`,
            platform: "Steam",
            id: appId,
            isActive: true,
          };
        }
      }
      return null;
    } catch (error) {
      console.error(
        `❌ Помилка отримання деталей гри ${appId}:`,
        error.message
      );
      return null;
    }
  }

  parseFreeGamesFromAPI(data) {
    const freeGames = [];
    const now = new Date();

    // Перевіряємо спеціальні акції
    if (data.specials && data.specials.items) {
      data.specials.items.forEach((game) => {
        if (this.isGameFree(game)) {
          freeGames.push({
            title: game.name,
            description: "",
            url: `https://store.steampowered.com/app/${game.id}`,
            originalPrice: game.original_price
              ? (game.original_price / 100).toFixed(0) + "₴"
              : null,
            startDate: now,
            endDate: this.addDays(now, 7), // Припускаємо 7 днів для акцій
            image: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.id}/header.jpg`,
            platform: "Steam",
            id: game.id.toString(),
            isActive: true,
          });
        }
      });
    }

    return freeGames;
  }

  isGameFree(game) {
    // Гра безкоштовна якщо:
    // 1. final_price = 0 і original_price > 0 (тимчасова роздача)
    // 2. original_price = 0 (завжди безкоштовна)
    return (
      (game.final_price === 0 && game.original_price > 0) ||
      game.original_price === 0
    );
  }

  removeDuplicates(games) {
    const seen = new Set();
    return games.filter((game) => {
      if (seen.has(game.id)) {
        return false;
      }
      seen.add(game.id);
      return true;
    });
  }

  addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
}
