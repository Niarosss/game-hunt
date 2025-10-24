import axios from "axios";

export class PSPlus {
  constructor() {
    this.baseURL = "https://blog.playstation.com";
    this.userAgent =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
    this.http = axios.create({
      headers: { "User-Agent": this.userAgent },
      timeout: 15000,
    });
  }

  log(step, msg, data = "") {
    console.log(`${step} ${msg}`, data);
  }

  async fetch(url, timeout = 10000) {
    try {
      const res = await this.http.get(url, { timeout });
      return res.data;
    } catch (err) {
      this.log("❌", `Помилка завантаження ${url}:`, err.message);
      return null;
    }
  }

  async getPSPlusArticles() {
    const rss = await this.fetch(`${this.baseURL}/tag/playstation-plus/feed/`);
    if (!rss) return [];

    const items = rss.match(/<item>[\s\S]*?<\/item>/gi) || [];
    const articles = items
      .map((item) => {
        const title = this.clean(this.extract(item, "title"));
        const url = this.extract(item, "link");
        const date = new Date(this.extract(item, "pubDate") || Date.now());
        if (!title || !url) return null;
        return this.isRelevant(title) ? { title, url, date } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.date - a.date)
      .slice(0, 10);

    return articles;
  }

  extract(text, tag) {
    const m = text.match(new RegExp(`<${tag}>([^<]*)<\/${tag}>`, "i"));
    return m ? m[1] : "";
  }

  isRelevant(title) {
    const t = title.toLowerCase();
    const inc = ["monthly games", "game catalog"];
    const exc = ["southeast asia", "asia", "japan", "korea", "india"];
    return inc.some((p) => t.includes(p)) && !exc.some((p) => t.includes(p));
  }

  async getLatestArticle(keyword) {
    this.log("🔍", "Отримую статті PS Plus...");
    const articles = await this.getPSPlusArticles();
    const found = articles.find((a) => a.title.toLowerCase().includes(keyword));
    if (!found) this.log("❌", `Не знайдено статтю: ${keyword}`);
    return found || null;
  }

  async getMonthlyGames() {
    const article = await this.getLatestArticle("monthly games");
    if (!article) return { games: [], article: null };
    const games = await this.parseArticle(article, "monthly");
    return { games, article };
  }

  async getCatalogGames() {
    const article = await this.getLatestArticle("game catalog");
    if (!article) return { games: [], article: null };
    const games = await this.parseArticle(article, "catalog");
    return { games, article };
  }

  async parseArticle(article, type) {
    const html = await this.fetch(article.url);
    if (!html) return [];

    const titles = this.extractGameTitles(html, type);
    const games = [];
    for (const title of titles) {
      if (!this.isValidTitle(title)) continue;
      const url = await this.getStoreUrl(title);
      games.push({
        title,
        storeUrl: url,
        platform: "PS Plus",
        type,
        endDate: type === "monthly" ? this.nextTuesday() : null,
        isActive: true,
      });
    }
    this.log("🎮", `Знайдено ігор: ${games.length}`);
    return games;
  }

  extractGameTitles(html, type) {
    const matches = new Set();
    const tag = type === "catalog" ? "h3" : "p";
    const blockMatches =
      html.match(new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi")) || [];
    blockMatches.forEach((b) => {
      const m = b.match(/<strong>([^<]+)<\/strong>/i);
      if (m) matches.add(this.clean(m[1]));
    });

    const allStrong = html.match(/<strong>([^<]{5,80})<\/strong>/gi) || [];
    allStrong.forEach((s) =>
      matches.add(this.clean(s.replace(/<\/?strong>/g, "")))
    );

    return Array.from(matches);
  }

  isValidTitle(text) {
    if (!text || text.length < 3 || text.length > 80) return false;
    const bad = [
      "playstation plus",
      "monthly games",
      "game catalog",
      "extra",
      "premium",
      "essential",
      "download",
      "update",
      "sale",
      "deal",
      "patch",
      "blog",
      "video",
    ];
    const t = text.toLowerCase();
    if (bad.some((p) => t.includes(p))) return false;
    return /[a-zA-Z]/.test(text);
  }

  clean(t) {
    return t
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&#8217;/g, "'")
      .replace(/&#8211;/g, "-")
      .replace(/\s+/g, " ")
      .trim();
  }

  nextTuesday() {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(1);
    while (d.getDay() !== 2) d.setDate(d.getDate() + 1);
    return d;
  }

  async getAllGames() {
    const [m, c] = await Promise.all([
      this.getMonthlyGames(),
      this.getCatalogGames(),
    ]);
    return { monthly: m, catalog: c, all: [...m.games, ...c.games] };
  }

  async getStoreUrl(title) {
    const clean = title
      .replace(/\s*\|\s*[^|]*$/g, "")
      .replace(/\s*\([^)]*\)/g, "")
      .replace(/\b(PS5|PS4|PSVR2?)\b/gi, "")
      .trim();

    const q = encodeURIComponent(`"${clean}"`);
    const html = await this.fetch(
      `https://store.playstation.com/uk-ua/search/${q}`
    );
    if (!html) return null;

    const m = html.match(/href="(\/uk-ua\/product\/[^"]*)"/);
    if (m) {
      const url = `https://store.playstation.com${m[1]}`;
      return url;
    }
    this.log("🔍", "Посилання не знайдено");
    return `https://store.playstation.com/uk-ua/search/${q}`;
  }
}
