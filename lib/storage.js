import { readFileSync, writeFileSync, existsSync } from "fs";

export class Storage {
  constructor() {
    this.filePath = "./data/games.json";
    this.ensureDataFile();
  }

  ensureDataFile() {
    if (!existsSync("./data")) {
      const fs = require("fs");
      fs.mkdirSync("./data");
    }
    if (!existsSync(this.filePath)) {
      this.saveGames({ epic: [], steam: [] });
    }
  }

  loadGames() {
    try {
      const data = readFileSync(this.filePath, "utf8");
      return JSON.parse(data);
    } catch (error) {
      console.error("❌ Помилка завантаження даних:", error);
      return { epic: [], steam: [] };
    }
  }

  saveGames(games) {
    try {
      writeFileSync(this.filePath, JSON.stringify(games, null, 2));
      return true;
    } catch (error) {
      console.error("❌ Помилка збереження даних:", error);
      return false;
    }
  }

  // Знаходить нові ігри порівняно зі збереженими
  findNewGames(oldGames, newGames, platform) {
    const oldIds = new Set(oldGames[platform].map((game) => game.id));
    return newGames.filter((game) => !oldIds.has(game.id));
  }

  // Знаходить ігри, які закінчилися
  findEndedGames(oldGames, newGames, platform) {
    const newIds = new Set(newGames.map((game) => game.id));
    return oldGames[platform].filter((oldGame) => !newIds.has(oldGame.id));
  }

  // Оновлює дані та повертає зміни
  updateGames(newEpicGames, newSteamGames) {
    const oldGames = this.loadGames();

    const changes = {
      newEpic: this.findNewGames(oldGames, newEpicGames, "epic"),
      newSteam: this.findNewGames(oldGames, newSteamGames, "steam"),
      endedEpic: this.findEndedGames(oldGames, newEpicGames, "epic"),
      endedSteam: this.findEndedGames(oldGames, newSteamGames, "steam"),
    };

    // Зберігаємо нові дані
    const updatedGames = {
      epic: newEpicGames,
      steam: newSteamGames,
      lastUpdate: new Date().toISOString(),
    };

    this.saveGames(updatedGames);

    return changes;
  }

  // Отримує статистику
  getStats() {
    const games = this.loadGames();
    return {
      totalEpic: games.epic.length,
      totalSteam: games.steam.length,
      lastUpdate: games.lastUpdate,
    };
  }
}
