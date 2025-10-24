import axios from "axios";

export class TelegramBot {
  constructor(token, chatId) {
    this.token = token;
    this.chatId = chatId;
    this.baseURL = `https://api.telegram.org/bot${token}`;
  }

  // Функція для отримання поточної дати
  getCurrentDate() {
    return new Date().toLocaleDateString("uk-UA", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  async sendMessage(message, parse_mode = "HTML") {
    try {
      await axios.post(`${this.baseURL}/sendMessage`, {
        chat_id: this.chatId,
        text: message,
        parse_mode: parse_mode,
        disable_web_page_preview: false,
      });
      return true;
    } catch (error) {
      console.error("❌ Помилка відправки повідомлення:", error.response?.data);
      return false;
    }
  }

  // Форматування для нових Epic Games
  formatNewEpicGamesMessage(games) {
    let message = `🆕 НОВА БЕЗКОШТОВНА ГРА в <b>Epic Games</b>!\n\n`;
    message += `📅 <i>${this.getCurrentDate()}</i>\n\n`;
    message += `───────────────\n\n`;

    games.forEach((game) => {
      const priceInfo = game.hasMeaningfulPrice
        ? `💵 <s>${game.originalPrice}</s> <b>БЕЗКОШТОВНО</b>\n`
        : "🎁 <b>БЕЗКОШТОВНО</b>\n";

      const endDate = game.endDate
        ? `⏰ До: <b>${new Date(game.endDate).toLocaleDateString(
            "uk-UA"
          )}</b>\n`
        : "";

      message += `🎮 <b>${game.title}</b>\n${priceInfo}${endDate}`;
      message += `🔗 <a href="${game.url}">Отримати гру</a>\n`;
    });

    return message;
  }

  // Форматування для нових Steam ігор
  formatNewSteamGamesMessage(games) {
    let message = `🆕 НОВА БЕЗКОШТОВНА ГРА в <b>Steam</b>!\n\n`;
    message += `📅 <i>${this.getCurrentDate()}</i>\n\n`;
    message += `───────────────\n\n`;

    games.forEach((game) => {
      const priceInfo = game.originalPrice
        ? `💵 <s>${game.originalPrice}</s> <b>БЕЗКОШТОВНО</b>\n`
        : "🎁 <b>БЕЗКОШТОВНО</b>\n";

      message += `🎮 <b>${game.title}</b>\n${priceInfo}`;
      message += `🔗 <a href="${game.url}">Отримати гру</a>\n`;
    });

    return message;
  }

  async sendNewEpicGames(games) {
    try {
      console.log(`📤 Відправляю нові Epic Games...`);
      console.log(`🎯 Кількість: ${games.length}`);

      if (games.length === 0) {
        console.log("ℹ️ Немає нових Epic Games");
        return false;
      }

      const message = this.formatNewEpicGamesMessage(games);
      return await this.sendMessage(message);
    } catch (error) {
      console.error("❌ Помилка відправки Epic Games:", error);
      return false;
    }
  }

  async sendNewSteamGames(games) {
    try {
      console.log(`📤 Відправляю нові Steam ігри...`);
      console.log(`⚡ Кількість: ${games.length}`);

      if (games.length === 0) {
        console.log("ℹ️ Немає нових Steam ігор");
        return false;
      }

      const message = this.formatNewSteamGamesMessage(games);
      return await this.sendMessage(message);
    } catch (error) {
      console.error("❌ Помилка відправки Steam ігор:", error);
      return false;
    }
  }

  formatPSPlusMonthlyMessage(games, article) {
    let message = `🆕 <b>НОВІ ІГРИ МІСЯЦЯ PS PLUS</b>\n`;

    message += `📅 <i>${this.getCurrentDate()}</i>\n\n`;
    message += `───────────────\n\n`;

    games.forEach((game) => {
      const endDate = game.endDate
        ? `⏰ До: <b>${new Date(game.endDate).toLocaleDateString(
            "uk-UA"
          )}</b>\n`
        : "";

      message += `🎮 <b>${game.title}</b>\n`;
      message += endDate;
      message += `🔗 <a href="${game.storeUrl}">Отримати гру</a>\n\n`;
    });

    message += `───────────────\n\n`;

    // Додаємо посилання на статтю один раз в кінці
    if (article?.url) {
      message += `🔗 Джерело:\n<a href="${article.url}">${article.title}</a>\n`;
    }

    return message;
  }

  formatPSPlusCatalogMessage(games, article) {
    let message = `🆕 <b>НОВІ ІГРИ В КАТАЛОЗІ PS PLUS</b>\n`;

    message += `📅 <i>${this.getCurrentDate()}</i>\n\n`;
    message += `───────────────\n\n`;

    games.forEach((game) => {
      message += `🎮 <b>${game.title}</b>\n`;
      message += `🔗 <a href="${game.storeUrl}">Отримати гру</a>\n\n`;
    });

    message += `───────────────\n\n`;

    // Додаємо посилання на статтю один раз в кінці
    if (article?.url) {
      message += `🔗 Джерело:\n<a href="${article.url}">${article.title}</a>\n`;
    }

    return message;
  }

  async sendPSPlusMonthly(games, article) {
    try {
      console.log(`📤 Відправляю місячні ігри PS Plus...`);
      console.log(`🎯 Кількість: ${games.length}`);

      if (games.length === 0) {
        console.log("ℹ️ Немає місячних ігор PS Plus");
        return false;
      }

      const message = this.formatPSPlusMonthlyMessage(games, article);
      return await this.sendMessage(message);
    } catch (error) {
      console.error("❌ Помилка відправки місячних ігор PS Plus:", error);
      return false;
    }
  }

  async sendPSPlusCatalog(games, article) {
    try {
      console.log(`📤 Відправляю ігри каталогу PS Plus...`);
      console.log(`📚 Кількість: ${games.length}`);

      if (games.length === 0) {
        console.log("ℹ️ Немає ігор в каталозі PS Plus");
        return false;
      }

      const message = this.formatPSPlusCatalogMessage(games, article);
      return await this.sendMessage(message);
    } catch (error) {
      console.error("❌ Помилка відправки ігор каталогу PS Plus:", error);
      return false;
    }
  }
}
