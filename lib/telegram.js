import axios from "axios";

export class TelegramBot {
  constructor(token, chatId, options = {}) {
    this.token = token;
    this.chatId = chatId;
    this.baseURL = `https://api.telegram.org/bot${token}`;

    // Зберігаємо опції, передані з файлу налаштувань
    this.options = {
      sendEnabled: true,
      log: true,
      disableWebPagePreview: false,
      defaultParseMode: "HTML",
      ...options, // Перезаписуємо значення за замовчуванням переданими опціями
    };
  }

  getCurrentDate() {
    return new Date().toLocaleString("uk-UA", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  async sendMessage(message, sendOpts = {}) {
    // Перевіряємо, чи увімкнена відправка повідомлень
    if (!this.options.sendEnabled) {
      if (this.options.log)
        console.log("ℹ️ Відправка повідомлень вимкнена в налаштуваннях.");
      return true; // Повертаємо true, щоб не ламати логіку підрахунку відправлених повідомлень
    }

    try {
      await axios.post(`${this.baseURL}/sendMessage`, {
        chat_id: this.chatId,
        text: message,
        // Використовуємо parse_mode з налаштувань
        parse_mode: this.options.defaultParseMode,
        // Використовуємо disableWebPagePreview з налаштувань
        disable_web_page_preview:
          sendOpts.disable_web_page_preview ??
          this.options.disableWebPagePreview,
      });

      if (this.options.log) console.log("✅ Повідомлення відправлено");
      return true;
    } catch (error) {
      console.error("❌ Помилка відправки повідомлення:", error.response?.data);
      return false;
    }
  }

  // Форматування для нових Epic Games
  formatNewEpicGamesMessage(games) {
    const gameCount = games.length;
    let message = `<b>${
      gameCount > 1 ? "Нові ігри" : "Нова гра"
    } в Epic Games Store</b>\n\n`;

    games.forEach((game) => {
      const endDate = game.endDate
        ? `\n⏰ Роздача закінчується: ${new Date(
            game.endDate
          ).toLocaleDateString("uk-UA")}`
        : "";
      message += `🎮 <a href="${game.url}">${game.title}</a>${endDate}\n`;
    });
    return message;
  }

  // Форматування для нових Steam ігор
  formatNewSteamGamesMessage(games) {
    let message = "<b>Нові безкоштовні ігри в Steam</b>\n\n";
    games.forEach((game) => {
      message += `🎮 <a href="${game.url}">${game.title}</a>\n`;
    });
    return message;
  }

  async sendNewEpicGames(games) {
    if (this.options.log)
      console.log("📤 Надсилаю повідомлення про нові Epic Games...");
    const message = this.formatNewEpicGamesMessage(games);
    return await this.sendMessage(message);
  }

  async sendNewSteamGames(games) {
    if (this.options.log)
      console.log("📤 Надсилаю повідомлення про нові Steam ігри...");
    const message = this.formatNewSteamGamesMessage(games);
    return await this.sendMessage(message);
  }

  formatPSPlusMonthlyMessage(games, article) {
    let message = `🆕 Ігри місяця в <b>PS PLUS</b>\n\n`;
    message += `🗓 <i>${this.getCurrentDate()}</i>\n\n`;

    if (this.options.previewSourceFirst && article?.url) {
      message += `🔗 Джерело:\n<a href="${article.url}">${article.title}</a>\n\n`;
    }

    message += `───────────────\n\n`;

    games.forEach((game) => {
      const endDate = game.endDate
        ? `⏰ До: <b>${new Date(game.endDate).toLocaleDateString(
            "uk-UA"
          )}</b>\n`
        : "";

      message += `🎮 <b>${game.title}</b>\n${endDate}`;
      message += `🔗 <a href="${
        game.storeUrl || game.url || "#"
      }">Отримати гру</a>\n\n`;
    });

    if (!this.options.previewSourceFirst && article?.url) {
      message += `───────────────\n\n`;
      message += `🔗 Джерело:\n<a href="${article.url}">${article.title}</a>\n`;
    } else {
      message += `───────────────\n`;
    }

    return message;
  }

  formatPSPlusCatalogMessage(games, article) {
    let message = `🆕 Ігри в <b>КАТАЛОЗІ PS PLUS</b>\n\n`;
    message += `🗓 <i>${this.getCurrentDate()}</i>\n\n`;

    if (this.options.previewSourceFirst && article?.url) {
      message += `🔗 Джерело:\n<a href="${article.url}">${article.title}</a>\n\n`;
    }

    message += `───────────────\n\n`;

    games.forEach((game) => {
      message += `🎮 <b>${game.title}</b>\n`;
      message += `🔗 <a href="${
        game.storeUrl || game.url || "#"
      }">Отримати гру</a>\n\n`;
    });

    if (!this.options.previewSourceFirst && article?.url) {
      message += `───────────────\n\n`;
      message += `🔗 Джерело:\n<a href="${article.url}">${article.title}</a>\n`;
    } else {
      message += `───────────────\n`;
    }

    return message;
  }

  async sendPSPlusMonthly(games, article) {
    if (this.options.log)
      console.log("📤 Надсилаю повідомлення про нові місячні ігри PS Plus...");
    const message = this.formatPSPlusMonthlyMessage(games, article);
    return await this.sendMessage(message);
  }

  async sendPSPlusCatalog(games, article) {
    if (this.options.log)
      console.log(
        "📤 Надсилаю повідомлення про нові ігри в каталозі PS Plus..."
      );
    const message = this.formatPSPlusCatalogMessage(games, article);
    return await this.sendMessage(message);
  }
}
