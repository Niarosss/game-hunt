// storage.js
import fs from "fs";
import path from "path";
import { kv } from "./kv.js";

export class Storage {
  constructor() {
    this.isProd = process.env.VERCEL_ENV === "production";
    this.filePath = path.join(process.cwd(), "data", "games.json");
    if (!this.isProd) this.initLocal();
  }

  initLocal() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(
        this.filePath,
        JSON.stringify(
          {
            epic: [],
            steam: [],
            psPlus: { monthly: [], catalog: [] },
            lastUpdate: null,
          },
          null,
          2
        )
      );
    }
  }

  async loadGames() {
    if (this.isProd) {
      const data = await kv.get("games");
      return (
        data || {
          epic: [],
          steam: [],
          psPlus: { monthly: [], catalog: [] },
          lastUpdate: null,
        }
      );
    }
    return JSON.parse(fs.readFileSync(this.filePath, "utf8"));
  }

  async saveGames(games) {
    const data = { ...games, lastUpdate: new Date().toISOString() };
    if (this.isProd) {
      await kv.set("games", data);
    } else {
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
    }
    return true;
  }

  findNewGames(oldGames, newGames, platform) {
    const oldIds = new Set((oldGames[platform] || []).map((g) => g.id));
    return newGames.filter((g) => g?.id && !oldIds.has(g.id));
  }

  // Новий метод для PS Plus
  findNewPSPlusGames(oldPSPlus, newPSPlus, type) {
    // Додаємо перевірки на наявність даних
    if (!newPSPlus || !newPSPlus[type]) {
      return [];
    }
    const oldIds = new Set((oldPSPlus[type] || []).map((g) => g.title));
    return newPSPlus[type].filter((g) => g?.title && !oldIds.has(g.title));
  }

  async updateGames(
    newEpic,
    newSteam,
    newPSPlus = { monthly: [], catalog: [] } // Значення за замовчуванням
  ) {
    const oldGames = await this.loadGames();

    // Гарантуємо, що newPSPlus має правильну структуру
    const safePSPlus = {
      monthly: newPSPlus?.monthly || [],
      catalog: newPSPlus?.catalog || [],
    };

    const changes = {
      newEpic: this.findNewGames(oldGames, newEpic, "epic"),
      newSteam: this.findNewGames(oldGames, newSteam, "steam"),
      newPSPlus: {
        monthly: this.findNewPSPlusGames(
          oldGames.psPlus,
          safePSPlus,
          "monthly"
        ),
        catalog: this.findNewPSPlusGames(
          oldGames.psPlus,
          safePSPlus,
          "catalog"
        ),
      },
    };

    await this.saveGames({
      epic: newEpic,
      steam: newSteam,
      psPlus: safePSPlus,
    });
    return changes;
  }

  async getStats() {
    const games = await this.loadGames();
    return {
      totalEpic: games.epic.length,
      totalSteam: games.steam.length,
      totalPSPlusMonthly: games.psPlus?.monthly?.length || 0,
      totalPSPlusCatalog: games.psPlus?.catalog?.length || 0,
      lastUpdate: games.lastUpdate,
    };
  }
}
