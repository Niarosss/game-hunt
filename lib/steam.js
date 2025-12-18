import axios from "axios";

export class Steam {
  constructor() {
    this.baseURL = "https://store.steampowered.com";
  }

  async getFreeGames() {
    try {
      // 1. Дані з API
      const apiData = await axios.get(`${this.baseURL}/api/featuredcategories`);
      const freeFromAPI = this.parseFreeGamesFromAPI(apiData.data);
      console.info(`📦 Steam API: ${freeFromAPI.length} безкоштовних`);

      // 2. Дані зі сторінки пошуку
      const freeFromPage = await this.parseFreeGamesFromPage();
      console.info(`🌐 Steam HTML: ${freeFromPage.length} безкоштовних`);

      // 3. Об’єднання і фільтр дублікатів
      const all = this.removeDuplicates([...freeFromAPI, ...freeFromPage]);
      console.info(
        `✅ Steam: всього ${all.length} унікальних безкоштовних ігор`
      );

      return all;
    } catch (error) {
      console.error("❌ Steam: помилка отримання ігор:", error.message);
      return [];
    }
  }

  parseFreeGamesFromAPI(data) {
    if (!data?.specials?.items) return [];

    const now = new Date();
    return data.specials.items
      .filter((g) => this.isGameFree(g))
      .map((g) => ({
        id: g.id.toString(),
        title: g.name,
        url: `https://store.steampowered.com/app/${g.id}`,
        originalPrice: g.original_price
          ? (g.original_price / 100).toFixed(0) + "₴"
          : null,
        endDate: this.addDays(now, 7),
        platform: "Steam",
        isActive: true,
      }));
  }

  async parseFreeGamesFromPage() {
    try {
      const url = `${this.baseURL}/search/?maxprice=free&category1=998&specials=1&ndl=1&l=ukrainian&cc=ua`;
      const { data: html } = await axios.get(url, {
        headers: {
          "Accept-Language": "uk-UA,uk;q=0.9",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        },
      });

      const appIds = this.extractAppIds(html);
      console.info(`🔍 Steam HTML: знайдено ${appIds.length} appid`);

      const games = await Promise.all(
        appIds.slice(0, 15).map((id) => this.getGameDetails(id))
      );

      return games.filter(Boolean);
    } catch (error) {
      console.error("❌ Steam: помилка парсингу сторінки:", error.message);
      return [];
    }
  }

  extractAppIds(html) {
    const ids = new Set();
    const regex = /data-ds-appid="(\d+)"/g;
    let match;
    while ((match = regex.exec(html)) !== null) ids.add(match[1]);
    return [...ids];
  }

  async getGameDetails(appId) {
    try {
      const { data } = await axios.get(
        `${this.baseURL}/api/appdetails?appids=${appId}&l=ukrainian&cc=ua`
      );
      const item = data[appId];
      if (!item?.success) return null;

      const g = item.data;
      const isFree = g.is_free || g.price_overview?.final === 0;
      if (!isFree) return null;

      return {
        title: g.name,
        url: `${this.baseURL}/app/${appId}`,
        originalPrice: g.price_overview
          ? (g.price_overview.initial / 100).toFixed(0) + "₴"
          : null,
        endDate: null,
        platform: "Steam",
        id: appId,
        isActive: true,
      };
    } catch {
      return null;
    }
  }

  isGameFree(game) {
    return (
      (game.final_price === 0 && game.original_price > 0) ||
      game.original_price === 0
    );
  }

  removeDuplicates(games) {
    const seen = new Set();
    return games.filter((g) => {
      if (seen.has(g.id)) return false;
      seen.add(g.id);
      return true;
    });
  }

  addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }
}
