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
        JSON.stringify({ epic: [], steam: [], lastUpdate: null }, null, 2)
      );
    }
  }

  async loadGames() {
    if (this.isProd) {
      const data = await kv.get("games");
      return data || { epic: [], steam: [], lastUpdate: null };
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

  async updateGames(newEpic, newSteam) {
    const oldGames = await this.loadGames();
    const changes = {
      newEpic: this.findNewGames(oldGames, newEpic, "epic"),
      newSteam: this.findNewGames(oldGames, newSteam, "steam"),
    };
    await this.saveGames({ epic: newEpic, steam: newSteam });
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
}
