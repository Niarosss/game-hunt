import axios from "axios";

export class Steam {
  constructor() {
    this.baseURL = "https://store.steampowered.com";
  }

  async getFreeGames() {
    try {
      const apiIds = await this.getAppIdsFromAPI();
      const pageIds = await this.getAppIdsFromPage();

      const allIds = [...new Set([...apiIds, ...pageIds])];
      console.info(
        `✅ Steam: знайдено ${allIds.length} унікальних кандидатів на перевірку`,
      );

      const games = await Promise.all(
        allIds.slice(0, 20).map((id) => this.getGameDetails(id)),
      );

      const freeGames = games.filter(Boolean); // Видаляємо null
      console.info(
        `✅ Steam: всього ${freeGames.length} підтверджених безкоштовних ігор`,
      );

      return freeGames;
    } catch (error) {
      console.error("❌ Steam: помилка отримання ігор:", error.message);
      return [];
    }
  }

  async getAppIdsFromAPI() {
    try {
      const { data } = await axios.get(
        `${this.baseURL}/api/featuredcategories`,
      );
      if (!data?.specials?.items) return [];

      const freeGames = data.specials.items.filter(
        (g) =>
          (g.final_price === 0 && g.original_price > 0) ||
          g.original_price === 0,
      );
      console.info(`📦 Steam API: знайдено ${freeGames.length} безкоштовних`);
      return freeGames.map((g) => g.id.toString());
    } catch (e) {
      console.error("❌ Steam API: не вдалося отримати дані.", e.message);
      return [];
    }
  }

  async getAppIdsFromPage() {
    try {
      const url = `${this.baseURL}/search/?maxprice=free&category1=998&specials=1&ndl=1&l=ukrainian&cc=ua`;
      const { data: html } = await axios.get(url);
      const regex = /data-ds-appid="(\d+)"/g;
      const ids = [...html.matchAll(regex)].map((match) => match[1]);
      console.info(`🔍 Steam HTML: знайдено ${ids.length} appid`);
      return [...new Set(ids)]; // Повертаємо унікальні ID
    } catch (e) {
      console.error("❌ Steam HTML: не вдалося отримати дані.", e.message);
      return [];
    }
  }

  async getGameDetails(appId) {
    try {
      // 1. Отримуємо базові дані з API
      const { data: apiResponse } = await axios.get(
        `${this.baseURL}/api/appdetails?appids=${appId}&l=ukrainian&cc=ua`,
      );
      const item = apiResponse[appId];
      if (
        !item?.success ||
        (!item.data.is_free && item.data.price_overview?.final !== 0)
      ) {
        return null; // Не безкоштовна або помилка
      }
      const g = item.data;

      // 2. Отримуємо HTML сторінки для пошуку дати
      const { data: html } = await axios.get(
        `${this.baseURL}/app/${appId}?l=ukrainian&cc=ua`,
        {
          headers: {
            // Cookie для обходу можливих вікових обмежень
            Cookie: "birthtime=946684801; mature_content=1;",
          },
        },
      );
      const endDate = this.extractEndDateFromHTML(html);

      return {
        id: appId,
        title: g.name,
        url: `${this.baseURL}/app/${appId}`,
        imageUrl: g.header_image,
        originalPrice: g.price_overview
          ? (g.price_overview.initial / 100).toFixed(0) + "₴"
          : null,
        endDate: endDate, // Додаємо знайдену дату
      };
    } catch {
      return null;
    }
  }

  extractEndDateFromHTML(html) {
    const monthMap = {
      січ: 0,
      лют: 1,
      бер: 2,
      кві: 3,
      тра: 4,
      чер: 5,
      лип: 6,
      сер: 7,
      вер: 8,
      жов: 9,
      лис: 10,
      гру: 11,
    };

    const regex =
      /до\s+(\d{1,2})\s+(січ|лют|бер|кві|тра|чер|лип|сер|вер|жов|лис|гру)\.?'? о (\d{1,2}:\d{2})/;
    const match = html.match(regex);

    if (!match) return null;

    const day = parseInt(match[1], 10);
    const month = monthMap[match[2]];
    const [hours, minutes] = match[3].split(":").map(Number);

    const now = new Date();
    let year = now.getFullYear();

    // Обробка переходу року (якщо зараз грудень, а дата в січні)
    if (now.getMonth() === 11 && month === 0) {
      year++;
    }

    return new Date(year, month, day, hours, minutes);
  }
}
