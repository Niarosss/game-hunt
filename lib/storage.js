import fs from "fs";
import path from "path";
import { redis } from "./redis.js";

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
            psPlus: {
              monthly: { games: [], article: null },
              catalog: { games: [], article: null },
            },
            lastUpdate: null,
          },
          null,
          2,
        ),
      );
    }
  }

  async loadGames() {
    const defaultStructure = {
      epic: [],
      steam: [],
      psPlus: {
        monthly: { games: [], article: null },
        catalog: { games: [], article: null },
      },
      lastUpdate: null,
    };

    if (this.isProd) {
      const data = await redis.get("games");
      return data || defaultStructure;
    }

    try {
      return JSON.parse(fs.readFileSync(this.filePath, "utf8"));
    } catch (error) {
      console.log(
        "❌ Помилка завантаження з файлу, повертаю порожню структуру:",
        error.message,
      );
      return defaultStructure;
    }
  }

  async saveGames(games) {
    const data = { ...games, lastUpdate: new Date().toISOString() };
    if (this.isProd) {
      await redis.set("games", data);
    } else {
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
    }
    return true;
  }

  findNewGames(oldGames, newGames, platform) {
    const oldIds = new Set((oldGames[platform] || []).map((g) => g.id));
    return newGames.filter((g) => g?.id && !oldIds.has(g.id));
  }

  findNewPSPlusGames(oldPSPlus, newPSPlus, type) {
    if (
      !newPSPlus ||
      !newPSPlus[type] ||
      !Array.isArray(newPSPlus[type].games)
    ) {
      return {
        games: [],
        article: newPSPlus?.[type]?.article || null,
      };
    }

    const oldGames = oldPSPlus?.[type]?.games || [];
    const oldIds = new Set(oldGames.map((g) => g.title));

    const newGames = newPSPlus[type].games.filter(
      (g) => g?.title && !oldIds.has(g.title),
    );

    return {
      games: newGames,
      article: newPSPlus[type].article,
    };
  }

  async updateGames(
    newEpic,
    newSteam,
    newPSPlus = { monthly: [], catalog: [] },
  ) {
    const oldGames = await this.loadGames();

    const changes = {
      newEpic: this.findNewGames(oldGames, newEpic, "epic"),
      newSteam: this.findNewGames(oldGames, newSteam, "steam"),
      newPSPlus: {
        monthly: this.findNewPSPlusGames(oldGames.psPlus, newPSPlus, "monthly"),
        catalog: this.findNewPSPlusGames(oldGames.psPlus, newPSPlus, "catalog"),
      },
    };

    await this.saveGames({
      epic: newEpic,
      steam: newSteam,
      psPlus: {
        monthly: newPSPlus.monthly,
        catalog: newPSPlus.catalog,
      },
    });
    return changes;
  }

  async getStats() {
    const games = await this.loadGames();
    return {
      totalEpic: games.epic.length,
      totalSteam: games.steam.length,
      totalPSPlusMonthly: games.psPlus?.monthly?.games?.length || 0,
      totalPSPlusCatalog: games.psPlus?.catalog?.games?.length || 0,
      lastUpdate: games.lastUpdate,
    };
  }
}
