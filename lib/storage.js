import fs from "fs";
import path from "path";

export class Storage {
  constructor() {
    // Зберігаємо в самому репозиторії (як у вашому прикладі)
    this.filePath = path.join(process.cwd(), "data", "games.json");
    this.init();
  }

  init() {
    try {
      // Створюємо папку data якщо не існує
      const dataDir = path.dirname(this.filePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Створюємо файл якщо не існує
      if (!fs.existsSync(this.filePath)) {
        const initialData = { epic: [], steam: [], lastUpdate: null };
        fs.writeFileSync(this.filePath, JSON.stringify(initialData, null, 2));
        console.log("📁 Створено початковий файл даних");
      }
    } catch (error) {
      console.log("⚠️ Помилка ініціалізації:", error.message);
    }
  }

  loadGames() {
    try {
      const data = fs.readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(data);
      console.log("📁 Дані завантажено з файлу");
      return {
        epic: parsed.epic || [],
        steam: parsed.steam || [],
        lastUpdate: parsed.lastUpdate || null,
      };
    } catch (error) {
      console.log("⚠️ Помилка завантаження:", error.message);
      return { epic: [], steam: [], lastUpdate: null };
    }
  }

  saveGames(games) {
    try {
      const dataToSave = {
        epic: games.epic || [],
        steam: games.steam || [],
        lastUpdate: new Date().toISOString(),
      };

      fs.writeFileSync(this.filePath, JSON.stringify(dataToSave, null, 2));
      console.log("💾 Дані збережено у файл");
      return true;
    } catch (error) {
      console.log("❌ Помилка збереження:", error.message);
      return false;
    }
  }

  findNewGames(oldGames, newGames, platform) {
    const oldArray = oldGames[platform] || [];
    const oldIds = new Set(oldArray.map((game) => game?.id).filter(Boolean));
    const newGamesList = newGames.filter(
      (game) => game?.id && !oldIds.has(game.id)
    );

    console.log(
      `🔍 ${platform}: ${oldArray.length} старих, ${newGames.length} поточних, ${newGamesList.length} нових`
    );
    return newGamesList;
  }

  updateGames(newEpicGames, newSteamGames) {
    const oldGames = this.loadGames();

    const changes = {
      newEpic: this.findNewGames(oldGames, newEpicGames, "epic"),
      newSteam: this.findNewGames(oldGames, newSteamGames, "steam"),
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
