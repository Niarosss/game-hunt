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

  async updateGames(newEpicGames, newSteamGames) {
    const oldGames = await this.loadGames();

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
      totalEpic: games.epic.length,
      totalSteam: games.steam.length,
      lastUpdate: games.lastUpdate,
    };
  }

  // Решта методів без змін...
  findNewGames(oldGames, newGames, platform) {
    const oldIds = new Set(oldGames[platform].map((game) => game.id));
    return newGames.filter((game) => !oldIds.has(game.id));
  }

  findEndedGames(oldGames, newGames, platform) {
    const newIds = new Set(newGames.map((game) => game.id));
    return oldGames[platform].filter((oldGame) => !newIds.has(oldGame.id));
  }
}
