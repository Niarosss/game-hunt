import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Отримуємо поточну директорію для ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function dirname(url) {
  return path.dirname(fileURLToPath(url));
}

export class Storage {
  constructor() {
    this.dataDir = path.join(process.cwd(), "data");
    this.filePath = path.join(this.dataDir, "games.json");
    this.ensureDataFile();
  }

  ensureDataFile() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      if (!fs.existsSync(this.filePath)) {
        const initialData = { epic: [], steam: [], lastUpdate: null };
        fs.writeFileSync(this.filePath, JSON.stringify(initialData, null, 2));
        console.log("📁 Створено файл даних");
      }
    } catch (error) {
      console.log("⚠️ Помилка створення файлу:", error.message);
    }
  }

  loadGames() {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, "utf8");
        console.log("📁 Дані завантажено з файлу");
        return JSON.parse(data);
      }
    } catch (error) {
      console.log("⚠️ Помилка завантаження даних:", error.message);
    }

    return { epic: [], steam: [], lastUpdate: null };
  }

  saveGames(games) {
    try {
      games.lastUpdate = new Date().toISOString();
      fs.writeFileSync(this.filePath, JSON.stringify(games, null, 2));
      console.log("💾 Дані збережено у файл");
      return true;
    } catch (error) {
      console.log("❌ Помилка збереження даних:", error.message);
      return false;
    }
  }

  findNewGames(oldGames, newGames, platform) {
    const oldArray = oldGames[platform] || [];
    const oldIds = new Set(oldArray.map((game) => game?.id).filter(Boolean));
    const newGamesList = newGames.filter(
      (game) => game?.id && !oldIds.has(game.id)
    );

    console.log(`🔍 ${platform}: ${newGamesList.length} нових ігр`);
    return newGamesList;
  }

  findEndedGames(oldGames, newGames, platform) {
    const oldArray = oldGames[platform] || [];
    const newIds = new Set(newGames.map((game) => game?.id).filter(Boolean));
    const endedGames = oldArray.filter(
      (oldGame) => oldGame?.id && !newIds.has(oldGame.id)
    );

    console.log(`🔚 ${platform}: ${endedGames.length} ігор закінчилися`);
    return endedGames;
  }

  updateGames(newEpicGames, newSteamGames) {
    const oldGames = this.loadGames();

    console.log("🔄 Порівнюю з попередніми даними...");
    console.log("📊 Старі дані:", {
      epic: (oldGames.epic || []).length,
      steam: (oldGames.steam || []).length,
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

    this.saveGames(updatedGames);

    return changes;
  }

  getStats() {
    const games = this.loadGames();
    return {
      totalEpic: (games.epic || []).length,
      totalSteam: (games.steam || []).length,
      lastUpdate: games.lastUpdate,
    };
  }
}
