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

  async sendPhoto(photoUrls, caption, parse_mode = "HTML") {
    if (!this.options.sendEnabled) {
      if (this.options.log) {
        console.log("ℹ️ Відправка повідомлень вимкнена (sendEnabled=false).");
      }
      return true;
    }

    const urls = Array.isArray(photoUrls) ? photoUrls : [photoUrls];
    if (urls.length === 0) return true;

    const isSingle = urls.length === 1;
    const endpoint = isSingle
      ? `${this.baseURL}/sendPhoto`
      : `${this.baseURL}/sendMediaGroup`;

    const payload = { chat_id: this.chatId };
    const MAX_CAPTION_LENGTH = 1024;

    if (isSingle) {
      payload.photo = urls[0];
      payload.caption = caption;
      payload.parse_mode = parse_mode;
      payload.disable_web_page_preview = true;
    } else {
      payload.media = urls.slice(0, 10).map((url, index) => {
        const mediaItem = {
          type: "photo",
          media: url,
        };
        if (index === 0) {
          mediaItem.caption =
            caption.length > MAX_CAPTION_LENGTH
              ? caption.substring(0, MAX_CAPTION_LENGTH - 3) + "..."
              : caption;
          mediaItem.parse_mode = parse_mode;
        }
        return mediaItem;
      });
    }

    try {
      await axios.post(endpoint, payload);
      return true;
    } catch (error) {
      const errorAction = isSingle ? "фото" : "медіагрупи";
      console.error(
        `❌ Помилка відправки ${errorAction}:`,
        error.response?.data
      );
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
    const isSingleGame = games.length === 1;

    switch (source) {
      case "epic":
        title = isSingleGame
          ? "Безкоштовна гра в <b>EPIC GAMES</b>!"
          : "Безкоштовні ігри в <b>EPIC GAMES</b>!";
        break;
      case "steam":
        title = isSingleGame
          ? "Безкоштовна гра в <b>STEAM</b>!"
          : "Безкоштовні ігри в <b>STEAM</b>!";
        break;
      case "psPlusMonthly":
        title = "Ігри місяця в <b>PS PLUS</b>";
        break;
      case "psPlusCatalog":
        title = "Ігри в <b>КАТАЛОЗІ PS PLUS</b>";
        break;
      default:
        title = isSingleGame ? "Нова гра!" : "Нові ігри!";
    }

    let message = `🆕 ${title}\n\n`;
    message += `<blockquote>🗓 <i>${this.getCurrentDate()}</i></blockquote>\n\n`;

    if (article?.url) {
      message += `📰 <a href="${article.url}">Джерело</a>\n\n`;
    }

    games.forEach((game) => {
      message += `🎮 <b>${game.title}</b>\n`;

      if (game.originalPrice && game.originalPrice !== "0") {
        message += `💵 <s>${game.originalPrice}</s>\n`;
      }

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
   * @param {string} [options.imageUrl] - Необов'язковий URL зображення.
   * @returns {Promise<boolean>} - Успішність відправки.
   */
  async sendGames({ source, games, article }) {
    const sourceConfig = {
      epic: { title: "Epic Games ігри" },
      steam: { title: "Steam ігри" },
      psPlusMonthly: { title: "ігри місяця PS Plus" },
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

      let imagesToSend = [];
      if (source === "epic") {
        imagesToSend = games.map((g) => g.imageUrl).filter(Boolean);
      } else if (article?.imageUrl) {
        imagesToSend.push(article.imageUrl);
      }

      const message = this.formatGamesMessage({
        source,
        games,
        article,
      });

      if (imagesToSend.length > 0) {
        return await this.sendPhoto(imagesToSend, message);
      } else {
        return await this.sendMessage(message);
      }
    } catch (error) {
      console.error(`❌ Помилка відправки для ${source}:`, error);
      return false;
    }
  }

  /**
   * Форматує та відправляє звіт про результати перевірки.
   * @param {object} reportData - Дані для звіту.
   * @param {object} reportData.changes - Об'єкт зі змінами (newEpic, newSteam, newPSPlus).
   * @param {number} reportData.messagesSent - Кількість надісланих повідомлень.
   * @returns {Promise<boolean>}
   */
  async sendSummaryReport({ changes, messagesSent }) {
    const summary = `
✅ <b>Перевірку завершено!</b>

<b>Знайдено нових:</b>
- Epic Games: ${changes.newEpic.length}
- Steam: ${changes.newSteam.length}
- PS Plus Monthly: ${changes.newPSPlus?.monthly?.games?.length || 0}
- PS Plus Catalog: ${changes.newPSPlus?.catalog?.games?.length || 0}

<b>Надіслано повідомлень:</b> ${messagesSent}
    `;
    return this.sendMessage(summary);
  }

  /**
   * Форматує та відправляє звіт про помилку.
   * @param {Error} error - Об'єкт помилки.
   * @returns {Promise<boolean>}
   */
  async sendErrorReport(error) {
    const errorMessage = `❌ <b>Помилка під час перевірки</b>\n\n<code>${error.message}</code>`;
    return this.sendMessage(errorMessage);
  }

  /**
   * Форматує та відправляє звіт зі статистикою.
   * @param {object} stats - Об'єкт статистики з Storage.
   * @returns {Promise<boolean>}
   */
  async sendStatsReport(stats) {
    const statsMessage = `
<blockquote>📊 Статистика сховища ігор</blockquote>

<b>Всього ігор у базі:</b>
- Epic Games: ${stats.totalEpic}
- Steam: ${stats.totalSteam}
- PS Plus Monthly: ${stats.totalPSPlusMonthly}
- PS Plus Catalog: ${stats.totalPSPlusCatalog}

<b>Останнє оновлення:</b>
<i>${
      stats.lastUpdate
        ? new Date(stats.lastUpdate).toLocaleString("uk-UA")
        : "Невідомо"
    }</i>
    `;
    return this.sendMessage(statsMessage);
  }

  /**
   * Встановлює список команд для бота в Telegram API.
   * Ці команди з'являться в UI Telegram при введенні '/'.
   * @param {Array<object>} commands - Масив об'єктів команд: [{ command: "назва", description: "опис" }]
   * @returns {Promise<boolean>}
   */
  async setBotCommands(commands) {
    try {
      const response = await axios.post(`${this.baseURL}/setMyCommands`, {
        commands: commands,
      });

      if (response.data.ok) {
        if (this.options.log)
          console.log("✅ Команди бота успішно встановлені.");
        return true;
      } else {
        console.error(
          "❌ Помилка встановлення команд бота:",
          response.data.description
        );
        return false;
      }
    } catch (error) {
      console.error(
        "❌ Помилка при зверненні до Telegram API для встановлення команд:",
        error.message
      );
      return false;
    }
  }

  /**
   * Відправляє довідку по доступним командам бота.
   * @returns {Promise<boolean>}
   */
  async sendHelpMessage() {
    const helpMessage = `
👋 Привіт! Я твій бот для пошуку безкоштовних ігор.

<b>Доступні команди (лише для адміністратора):</b>
<i>- /check</i> - Запускає примусову перевірку нових безкоштовних ігор на всіх підключених платформах.
<i>- /stats</i> - Показує статистику по кількості збережених ігор у базі даних.
<i>- /help</i> - Виводить це довідкове повідомлення.

Якщо у тебе є питання або пропозиції, звернися до мого розробника - @Niaros.
    `;
    return this.sendMessage(helpMessage);
  }
}
