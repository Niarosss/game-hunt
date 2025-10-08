import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";

export class Storage {
  constructor() {
    this.filePath = "./data/games.json";
    this.data = { epic: [], steam: [], lastUpdate: null };
    this.ensureDataFile();
  }

  ensureDataFile() {
    try {
      if (!existsSync("./data")) {
        mkdirSync("./data", { recursive: true });
      }
      if (!existsSync(this.filePath)) {
        this.saveGames({ epic: [], steam: [] });
      }
    } catch (error) {
      // Ігноруємо помилки файлової системи на Vercel
      console.log("⚠️ Використовую памʼять замість файлів");
    }
  }

  loadGames() {
    try {
      if (existsSync(this.filePath)) {
        const data = readFileSync(this.filePath, "utf8");
        return JSON.parse(data);
      }
    } catch (error) {
      console.log("⚠️ Помилка завантаження файлу, використовую памʼять");
    }

    return this.data;
  }

  saveGames(games) {
    try {
      games.lastUpdate = new Date().toISOString();
      writeFileSync(this.filePath, JSON.stringify(games, null, 2));
    } catch (error) {
      // Зберігаємо в пам'яті як запасний варіант
      this.data = games;
    }
    return true;
  }

  // Решта методів залишається без змін...
  findNewGames(oldGames, newGames, platform) {
    const oldIds = new Set(oldGames[platform].map((game) => game.id));
    return newGames.filter((game) => !oldIds.has(game.id));
  }

  findEndedGames(oldGames, newGames, platform) {
    const newIds = new Set(newGames.map((game) => game.id));
    return oldGames[platform].filter((oldGame) => !newIds.has(oldGame.id));
  }

  updateGames(newEpicGames, newSteamGames) {
    const oldGames = this.loadGames();

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

    this.saveGames(updatedGames);

    return changes;
  }

  getStats() {
    const games = this.loadGames();
    return {
      totalEpic: games.epic.length,
      totalSteam: games.steam.length,
      lastUpdate: games.lastUpdate,
    };
  }
}
