import axios from "axios";

export class PSPlus {
  constructor() {
    this.baseURL = "https://blog.playstation.com";
    this.userAgent =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
  }

  async getPSPlusArticles() {
    try {
      console.log("🔍 Отримую статті PS Plus...");

      const rssArticles = await this.getArticlesFromPSPlusRSS();
      if (rssArticles.length > 0) {
        console.log(`✅ Знайдено ${rssArticles.length} статей з RSS PS Plus`);
        return rssArticles;
      }

      console.log("⚠️ Використовую хардкод статей");
      return this.getHardcodedArticles();
    } catch (error) {
      console.error("❌ Помилка отримання статей:", error);
      return this.getHardcodedArticles();
    }
  }

  async getArticlesFromPSPlusRSS() {
    try {
      const response = await axios.get(
        `${this.baseURL}/tag/playstation-plus/feed/`,
        {
          headers: { "User-Agent": this.userAgent },
          timeout: 10000,
        }
      );

      const rssData = response.data;
      const articles = [];

      const items = rssData.match(/<item>[\s\S]*?<\/item>/gi) || [];

      for (const item of items) {
        const titleMatch = item.match(/<title>([^<]*)<\/title>/i);
        const linkMatch = item.match(/<link>([^<]*)<\/link>/i);
        const pubDateMatch = item.match(/<pubDate>([^<]*)<\/pubDate>/i);

        if (titleMatch && linkMatch) {
          const title = this.cleanText(titleMatch[1]);
          const url = linkMatch[1];
          const pubDate = pubDateMatch ? new Date(pubDateMatch[1]) : new Date();

          if (this.isRelevantPSPlusArticle(title)) {
            articles.push({
              title: title,
              url: url,
              date: pubDate,
            });
          }
        }
      }

      articles.sort((a, b) => b.date - a.date);
      return articles.slice(0, 10);
    } catch (error) {
      console.log("❌ RSS PS Plus не доступний:", error.message);
      return [];
    }
  }

  isRelevantPSPlusArticle(title) {
    const titleLower = title.toLowerCase();

    const includePatterns = ["monthly games", "game catalog"];

    const excludePatterns = [
      "southeast asia",
      "asia",
      "japan",
      "korea",
      "india",
    ];

    const hasIncludePattern = includePatterns.some((pattern) =>
      titleLower.includes(pattern)
    );

    const hasExcludePattern = excludePatterns.some((pattern) =>
      titleLower.includes(pattern)
    );

    return hasIncludePattern && !hasExcludePattern;
  }

  getHardcodedArticles() {
    return [
      {
        title:
          "PlayStation Plus Monthly Games for October: Alan Wake 2, Goat Simulator 3, Cocoon",
        url: "https://blog.playstation.com/2025/10/01/playstation-plus-monthly-games-for-october-alan-wake-2-goat-simulator-3-cocoon/",
      },
      {
        title:
          "PlayStation Plus Game Catalog for October: Silent Hill 2, Until Dawn, V Rising, Yakuza: Like a Dragon and more",
        url: "https://blog.playstation.com/2025/10/15/playstation-plus-game-catalog-for-october-silent-hill-2-until-dawn-v-rising-yakuza-like-a-dragon-and-more/",
      },
    ];
  }

  async getLatestMonthlyArticleUrl() {
    try {
      console.log("🔍 Шукаю статтю про місячні ігри...");

      const articles = await this.getPSPlusArticles();

      const monthlyArticles = articles.filter((article) =>
        article.title.toLowerCase().includes("monthly games")
      );

      if (monthlyArticles.length > 0) {
        console.log(
          "✅ Знайдено статтю про місячні ігри:",
          monthlyArticles[0].title
        );
        return monthlyArticles[0];
      }

      console.log("❌ Не знайдено статтю про місячні ігри");
      return null;
    } catch (error) {
      console.error("❌ Помилка пошуку місячних ігор:", error);
      return null;
    }
  }

  async getLatestCatalogArticleUrl() {
    try {
      console.log("🔍 Шукаю статтю про каталог ігор...");

      const articles = await this.getPSPlusArticles();

      const catalogArticles = articles.filter((article) =>
        article.title.toLowerCase().includes("game catalog")
      );

      if (catalogArticles.length > 0) {
        console.log(
          "✅ Знайдено статтю про каталог:",
          catalogArticles[0].title
        );
        return catalogArticles[0];
      }

      console.log("❌ Не знайдено статтю про каталог");
      return null;
    } catch (error) {
      console.error("❌ Помилка пошуку каталогу:", error);
      return null;
    }
  }

  async getMonthlyGames() {
    try {
      console.log("🎯 Отримую місячні ігри PS Plus...");

      const monthlyArticle = await this.getLatestMonthlyArticleUrl();

      if (monthlyArticle) {
        const games = await this.parseArticleContent(monthlyArticle, "monthly");
        console.log(`🎯 Місячні ігри: ${games.length} ігор`);
        return {
          games: games,
          article: monthlyArticle,
        };
      }

      return { games: [], article: null };
    } catch (error) {
      console.error("❌ Помилка отримання місячних ігор:", error);
      return { games: [], article: null };
    }
  }

  async getCatalogGames() {
    try {
      console.log("📚 Отримую ігри каталогу PS Plus...");

      const catalogArticle = await this.getLatestCatalogArticleUrl();

      if (catalogArticle) {
        const games = await this.parseArticleContent(catalogArticle, "catalog");
        console.log(`📚 Ігри каталогу: ${games.length} ігор`);
        return {
          games: games,
          article: catalogArticle,
        };
      }

      return { games: [], article: null };
    } catch (error) {
      console.error("❌ Помилка отримання ігор каталогу:", error);
      return { games: [], article: null };
    }
  }

  async parseArticleContent(article, type) {
    try {
      console.log(`📖 Парсинг статті: ${article.url}`);

      const response = await axios.get(article.url, {
        headers: { "User-Agent": this.userAgent },
        timeout: 15000,
      });

      const html = response.data;
      const games = [];

      const articleImage = this.getArticleImage(html);
      console.log("📰 Заголовок статті:", article.title);

      // Простий та точний парсинг по конкретним тегам
      const gameTitles = this.extractGamesFromSpecificTags(html, type);
      console.log("🎮 Знайдені ігри:", gameTitles);

      gameTitles.forEach((title) => {
        if (title && this.isValidGameTitle(title)) {
          games.push({
            title: title.trim(),
            description:
              type === "monthly"
                ? "Місячна гра PS Plus"
                : "Гра з каталогу PS Plus",
            platform: "PS Plus",
            type: type,
            isActive: true,
            endDate: type === "monthly" ? this.getMonthlyEndDate() : null,
          });
        }
      });

      return games;
    } catch (error) {
      console.error(`❌ Помилка парсингу статті: ${error.message}`);
      return [];
    }
  }

  extractGamesFromSpecificTags(html, type) {
    const games = new Set();

    // Для каталогу: шукаємо в h3 з strong
    if (type === "catalog") {
      const h3Matches = html.match(/<h3[^>]*>[\s\S]*?<\/h3>/gi) || [];
      h3Matches.forEach((h3) => {
        const strongMatch = h3.match(/<strong>([^<]+)<\/strong>/i);
        if (strongMatch) {
          const gameTitle = this.cleanText(strongMatch[1]);
          if (this.isValidGameTitle(gameTitle)) {
            games.add(gameTitle);
          }
        }
      });
    }

    // Для місячних ігор: шукаємо в p з strong
    if (type === "monthly") {
      const pMatches = html.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];
      pMatches.forEach((p) => {
        const strongMatch = p.match(/<strong>([^<]+)<\/strong>/i);
        if (strongMatch) {
          const gameTitle = this.cleanText(strongMatch[1]);
          if (this.isValidGameTitle(gameTitle)) {
            games.add(gameTitle);
          }
        }
      });
    }

    // Додатково для обох типів: шукаємо в будь-яких strong тегах (резервний спосіб)
    const allStrongMatches =
      html.match(/<strong>([^<]{5,80})<\/strong>/gi) || [];
    allStrongMatches.forEach((strongTag) => {
      const gameTitle = this.cleanText(
        strongTag.replace(/<strong>|<\/strong>/gi, "")
      );
      if (this.isValidGameTitle(gameTitle)) {
        games.add(gameTitle);
      }
    });

    return Array.from(games);
  }

  isValidGameTitle(text) {
    if (!text || text.length < 3 || text.length > 80) return false;

    // Словник заборонених слів/фраз
    const excludePatterns = [
      "playstation plus",
      "monthly games",
      "game catalog",
      "extra and premium",
      "extra",
      "premium",
      "essential",
      "download",
      "image",
      "latest news",
      "leave a reply",
      "cancel reply",
      "trending stories",
      "please enter",
      "date of birth",
      "sorry, you may not",
      "skip to content",
      "menu ps5",
      "ps vr2",
      "ps store",
      "select a region",
      "current region:",
      "english french",
      "share this:",
      "posted in",
      "filed under",
      "tagged",
      "read more",
      "learn more",
      "watch now",
      "trailer",
      "video",
      "blog",
      "update",
      "patch",
      "discount",
      "sale",
      "deal",
      "ghost of yōtei",
      "adam michel",
      "aaron jason espinoza",
      "gary richards",
      "zack garvey",
      "hideaki nishino",
      "sid shuman",
      "andrew goldfarb",
      "he/him",
    ];

    const lowerText = text.toLowerCase();

    for (const pattern of excludePatterns) {
      if (lowerText.includes(pattern)) return false;
    }

    // Перевіряємо, чи це схоже на назву гри (містить літери та має розумну довжину)
    if (!/[a-zA-Z]/.test(text)) return false;
    if (text.split(" ").length === 1 && text.length < 4) return false;

    // Виключаємо тексти, що починаються з PlayStation Plus
    if (lowerText.startsWith("playstation plus")) return false;

    return true;
  }

  cleanText(html) {
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&#8217;/g, "'")
      .replace(/&#8211;/g, "-")
      .replace(/&#8230;/g, "...")
      .replace(/\s+/g, " ")
      .trim();
  }

  getArticleImage(html) {
    const imageMatches = [
      html.match(/<meta property="og:image" content="([^"]*)"/),
      html.match(/<meta name="twitter:image" content="([^"]*)"/),
      html.match(/<img[^>]*wp-post-image[^>]*src="([^"]*)"/),
      html.match(/<img[^>]*src="([^"]*)"[^>]*class="[^"]*wp-image/),
    ];

    for (const match of imageMatches) {
      if (match && match[1]) {
        const imageUrl = match[1].replace(/&amp;/g, "&");
        if (imageUrl.startsWith("http")) {
          return imageUrl;
        }
      }
    }

    return null;
  }

  getMonthlyEndDate() {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    while (nextMonth.getDay() !== 2) {
      nextMonth.setDate(nextMonth.getDate() + 1);
    }

    return nextMonth;
  }

  async getAllGames() {
    const [monthlyData, catalogData] = await Promise.all([
      this.getMonthlyGames(),
      this.getCatalogGames(),
    ]);

    return {
      monthly: {
        games: monthlyData.games,
        article: monthlyData.article,
      },
      catalog: {
        games: catalogData.games,
        article: catalogData.article,
      },
      all: [...monthlyData.games, ...catalogData.games],
    };
  }
}
