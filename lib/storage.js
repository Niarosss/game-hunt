import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";

export class Storage {
  constructor() {
    this.filePath = "./data/games.json";
    this.ensureDataFile();
  }

  ensureDataFile() {
    // На Vercel файлова система read-only, тому використовуємо альтернативне сховище
    if (typeof window === "undefined") {
      // Серверне середовище - використовуємо fs
      try {
        if (!existsSync("./data")) {
          mkdirSync("./data");
        }
        if (!existsSync(this.filePath)) {
          this.saveGames({ epic: [], steam: [] });
        }
      } catch (error) {
        // На Vercel можуть бути обмеження файлової системи
        console.log("⚠️ Файлова система обмежена, використовую памʼять");
      }
    }
  }

  loadGames() {
    try {
      // На Vercel використовуємо пам'ять замість файлів
      if (typeof window !== "undefined") {
        // Клієнтське середовище - використовуємо localStorage
        const data = localStorage.getItem("gamesData");
        return data ? JSON.parse(data) : { epic: [], steam: [] };
      } else {
        // Серверне середовище - спробуємо файли
        if (existsSync(this.filePath)) {
          const data = readFileSync(this.filePath, "utf8");
          return JSON.parse(data);
        }
      }
    } catch (error) {
      console.log(
        "⚠️ Помилка завантаження даних, використовую памʼять:",
        error.message
      );
    }

    return { epic: [], steam: [] };
  }

  saveGames(games) {
    try {
      games.lastUpdate = new Date().toISOString();

      if (typeof window !== "undefined") {
        // Клієнтське середовище
        localStorage.setItem("gamesData", JSON.stringify(games));
      } else {
        // Серверне середовище
        writeFileSync(this.filePath, JSON.stringify(games, null, 2));
      }
      return true;
    } catch (error) {
      console.log("⚠️ Помилка збереження даних:", error.message);
      // Все одно повертаємо true, бо дані будуть в пам'яті
      return true;
    }
  }

  // Решта методів залишається без змін
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
