import axios from "axios";

export class TelegramBot {
  constructor(token, chatId, options = {}) {
    this.token = token;
    this.chatId = chatId;
    this.baseURL = `https://api.telegram.org/bot${token}`;
    this.options = {
      sendEnabled: true,
      log: true,
      disableWebPagePreview: false,
      ...options,
    };
  }

  getCurrentDate() {
    return new Date().toLocaleDateString("uk-UA", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  async sendMessage(message, parse_mode = "HTML") {
    if (!this.options.sendEnabled) {
      if (this.options.log) {
        console.log("ℹ️ Відправка повідомлень вимкнена (sendEnabled=false).");
      }
      return true;
    }

    try {
      await axios.post(`${this.baseURL}/sendMessage`, {
        chat_id: this.chatId,
        text: message,
        parse_mode: parse_mode,
        disable_web_page_preview: this.options.disableWebPagePreview,
      });
      return true;
    } catch (error) {
      console.error("❌ Помилка відправки повідомлення:", error.response?.data);
      return false;
    }
  }

  /**
   * Універсальна функція для форматування повідомлення про ігри.
   * @param {object} options - Опції для форматування.
   * @param {string} options.source - Джерело ігор ('epic', 'steam', 'psPlusMonthly', 'psPlusCatalog').
   * @param {Array} options.games - Масив об'єктів ігор.
   * @param {object} [options.article] - Необов'язкова стаття-джерело.
   * @returns {string} - Відформатоване повідомлення.
   */
  formatGamesMessage({ source, games, article }) {
    let title = "";

    switch (source) {
      case "epic":
        title = "Безкоштовні ігри в <b>EPIC GAMES</b>!";
        break;
      case "steam":
        title = "Безкоштовні ігри в <b>STEAM</b>!";
        break;
      case "psPlusMonthly":
        title = "Ігри місяця в <b>PS PLUS</b>";
        break;
      case "psPlusCatalog":
        title = "Ігри в <b>КАТАЛОЗІ PS PLUS</b>";
        break;
      default:
        title = "Нові ігри!";
    }

    let message = `🆕 ${title}\n\n`;
    message += `<blockquote>🗓 <i>${this.getCurrentDate()}</i></blockquote>\n\n`;

    if (article?.url) {
      message += `📰 <a href="${article.url}">Джерело</a>\n\n`;
    }

    games.forEach((game) => {
      message += `🎮 <b>${game.title}</b>\n`;

      // Додаємо ціну, якщо вона є
      if ("originalPrice" in game) {
        message += game.originalPrice
          ? `💵 <s>${game.originalPrice}</s> <b>БЕЗКОШТОВНО</b>\n`
          : "🎁 <b>БЕЗКОШТОВНО</b>\n";
      }

      // Додаємо дату завершення, якщо вона є
      if (game.endDate) {
        message += `⏰ До: <b>${new Date(game.endDate).toLocaleDateString(
          "uk-UA"
        )}</b>\n`;
      }

      if (game.url) {
        message += `🔗 <a href="${game.url}">Отримати гру</a>\n\n`;
      }
    });

    return message;
  }

  /**
   * Універсальна функція для відправки повідомлень про ігри.
   * @param {object} options - Опції для відправки.
   * @param {string} options.source - Джерело ігор ('epic', 'steam', 'psPlusMonthly', 'psPlusCatalog').
   * @param {Array} options.games - Масив об'єктів ігор.
   * @param {object} [options.article] - Необов'язкова стаття-джерело.
   * @returns {Promise<boolean>} - Успішність відправки.
   */
  async sendGames({ source, games, article }) {
    const sourceConfig = {
      epic: { title: "Epic Games ігри" },
      steam: { title: "Steam ігри" },
      psPlusMonthly: { title: "місячні ігри PS Plus" },
      psPlusCatalog: { title: "ігри каталогу PS Plus" },
    };

    const config = sourceConfig[source] || { title: "нові ігри" };

    try {
      if (this.options.log) {
        console.log(`📤 Відправляю ${config.title}...`);
        console.log(`🎯 Кількість: ${games.length}`);
      }

      if (games.length === 0) {
        if (this.options.log) console.log(`ℹ️ Немає нових ігор (${source})`);
        return true;
      }

      const message = this.formatGamesMessage({
        source,
        games,
        article,
      });

      return await this.sendMessage(message);
    } catch (error) {
      console.error(`❌ Помилка відправки для ${source}:`, error);
      return false;
    }
  }
}
