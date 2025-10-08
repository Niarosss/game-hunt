import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Отримуємо поточну директорію для ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class Storage {
  constructor() {
    this.filePath = join(__dirname, "../data/games.json");
  }

  loadGames() {
    try {
      const data = readFileSync(this.filePath, "utf8");
      console.log("📁 Дані завантажено з файлу");
      return JSON.parse(data);
    } catch (error) {
      console.log(
        "⚠️ Помилка завантаження даних, використовую порожні дані:",
        error.message
      );
      return { epic: [], steam: [], lastUpdate: null };
    }
  }

  saveGames(games) {
    try {
      games.lastUpdate = new Date().toISOString();
      writeFileSync(this.filePath, JSON.stringify(games, null, 2));
      console.log("💾 Дані збережено у файл");
      return true;
    } catch (error) {
      console.log("❌ Помилка збереження даних:", error.message);
      return false;
    }
  }

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
