import { kv } from "@vercel/kv";

export class Storage {
  constructor() {
    this.key = "games_data";
  }

  async loadGames() {
    try {
      const data = await kv.get(this.key);
      console.log("📁 Дані завантажено з KV");
      return data || { epic: [], steam: [], lastUpdate: null };
    } catch (error) {
      console.log("⚠️ Помилка завантаження з KV:", error.message);
      return { epic: [], steam: [], lastUpdate: null };
    }
  }

  async saveGames(games) {
    try {
      games.lastUpdate = new Date().toISOString();
      await kv.set(this.key, games);
      console.log("💾 Дані збережено в KV");
      return true;
    } catch (error) {
      console.log("❌ Помилка збереження в KV:", error.message);
      return false;
    }
  }

  findNewGames(oldGames, newGames, platform) {
    // Додаємо перевірку на наявність платформи
    if (!oldGames[platform] || !Array.isArray(oldGames[platform])) {
      console.log(`⚠️ ${platform}: немає попередніх даних, всі ігри нові`);
      return newGames; // Всі ігри нові, якщо немає попередніх даних
    }

    const oldIds = new Set(oldGames[platform].map((game) => game.id));
    const newGamesList = newGames.filter((game) => !oldIds.has(game.id));

    console.log(
      `🔍 ${platform}: ${newGamesList.length} нових ігр з ${newGames.length}`
    );
    return newGamesList;
  }

  findEndedGames(oldGames, newGames, platform) {
    // Додаємо перевірку на наявність платформи
    if (!oldGames[platform] || !Array.isArray(oldGames[platform])) {
      return []; // Немає старих ігор - нічого не закінчилося
    }

    const newIds = new Set(newGames.map((game) => game.id));
    const endedGames = oldGames[platform].filter(
      (oldGame) => !newIds.has(oldGame.id)
    );

    console.log(`🔚 ${platform}: ${endedGames.length} ігор закінчилися`);
    return endedGames;
  }

  async updateGames(newEpicGames, newSteamGames) {
    const oldGames = await this.loadGames();

    console.log("🔄 Порівнюю з попередніми даними...");
    console.log("📊 Старі дані:", {
      epic: oldGames.epic?.length || 0,
      steam: oldGames.steam?.length || 0,
    });

    const changes = {
      newEpic: this.findNewGames(oldGames, newEpicGames, "epic"),
      newSteam: this.findNewGames(oldGames, newSteamGames, "steam"),
      endedEpic: this.findEndedGames(oldGames, newEpicGames, "epic"),
      endedSteam: this.findEndedGames(oldGames, newSteamGames, "steam"),
    };

    const updatedGames = {
      epic: newEpicGames,
      steam: newSteamGames,
      lastUpdate: new Date().toISOString(),
    };

    await this.saveGames(updatedGames);

    return changes;
  }

  async getStats() {
    const games = await this.loadGames();
    return {
      totalEpic: games.epic?.length || 0,
      totalSteam: games.steam?.length || 0,
      lastUpdate: games.lastUpdate,
    };
  }
}
