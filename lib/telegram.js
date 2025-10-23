import axios from "axios";

export class TelegramBot {
  constructor(token, chatId) {
    this.token = token;
    this.chatId = chatId;
    this.baseURL = `https://api.telegram.org/bot${token}`;
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

  async sendMediaGroup(photos, caption) {
    try {
      await axios.post(`${this.baseURL}/sendMediaGroup`, {
        chat_id: this.chatId,
        media: photos,
        caption: caption,
        parse_mode: "HTML",
      });
      return true;
    } catch (error) {
      console.error("❌ Помилка відправки медіа:", error.response?.data);
      return false;
    }
  }

  // Форматування для нових Epic Games
  formatNewEpicGamesMessage(games) {
    let message = `🆕 НОВА РОЗДАЧА!\n`;
    message += `🗿 <b>Epic Games</b>\n\n`;

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
      message += `🔗 <a href="${game.url}">Отримати гру</a>\n\n`;
    });

    return message;
  }

  // Форматування для нових Steam ігор
  formatNewSteamGamesMessage(games) {
    let message = `🆕 НОВА РОЗДАЧА!\n`;
    message += `🗿 <b>Steam</b>\n\n`;

    games.forEach((game) => {
      const priceInfo = game.originalPrice
        ? `💵 <s>${game.originalPrice}</s> <b>БЕЗКОШТОВНО</b>\n`
        : "🎁 <b>БЕЗКОШТОВНО</b>\n";

      message += `🎮 <b>${game.title}</b>\n${priceInfo}`;
      message += `🔗 <a href="${game.url}">Отримати гру</a>\n\n`;
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

  formatGiveawayMessage(epicGames, steamGames) {
    const currentDate = new Date().toLocaleDateString("uk-UA", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    let message = `🎮 <b>БЕЗКОШТОВНІ РОЗДАЧІ ІГОР</b>\n`;
    message += `📅 <i>${currentDate}</i>\n\n`;
    message += `───────────────\n\n`;

    // EPIC GAMES
    const epicActive = epicGames.filter((game) => game.isActive);
    const epicUpcoming = epicGames.filter(
      (game) => !game.isActive && game.startDate
    );

    if (epicActive.length > 0) {
      message += `🎯 <b>EPIC GAMES:</b>\n\n`;
      epicActive.forEach((game) => {
        const priceInfo = game.hasMeaningfulPrice
          ? `💵 <s>${game.originalPrice}</s> <b>БЕЗКОШТОВНО</b>\n`
          : "💵 <b>БЕЗКОШТОВНО</b>\n";

        const endDate = game.endDate
          ? `⏰ До: <b>${game.endDate.toLocaleDateString("uk-UA")}</b>\n`
          : "";

        message += `🎮 <b>${game.title}</b>\n`;
        message += priceInfo;
        message += endDate;
        message += `🔗 <a href="${game.url}">Отримати гру</a>\n\n`;
      });
    }

    // STEAM
    if (steamGames.length > 0) {
      if (epicActive.length > 0) message += `───────────────\n\n`;

      message += `⚡ <b>STEAM:</b>\n\n`;
      steamGames.forEach((game) => {
        const priceInfo = game.originalPrice
          ? `💵 <s>${game.originalPrice}</s> <b>БЕЗКОШТОВНО</b>\n`
          : "💵 <b>БЕЗКОШТОВНО</b>\n";

        message += `🎮 <b>${game.title}</b>\n`;
        message += priceInfo;
        message += `🔗 <a href="${game.url}">Отримати гру</a>\n\n`;
      });
    }

    // МАЙБУТНІ РОЗДАЧІ (Epic Games)
    if (epicUpcoming.length > 0) {
      message += `───────────────\n\n`;
      message += `📅 <b>МАЙБУТНІ РОЗДАЧІ EPIC GAMES:</b>\n\n`;

      epicUpcoming.sort((a, b) => a.startDate - b.startDate);
      epicUpcoming.forEach((game) => {
        message += `🕒 <b>${game.title}</b>\n`;
        message += `📆 ${game.startDate.toLocaleDateString("uk-UA")}\n\n`;
      });
    }

    message += `🔔 <i>Слідкуйте за оновленнями щодня!</i>`;

    return message;
  }

  createMediaGroup(epicGames, steamGames) {
    const media = [];
    const epicActive = epicGames.filter((game) => game.isActive);

    // Додаємо фото з Epic Games (до 2 штук)
    epicActive.slice(0, 2).forEach((game, index) => {
      media.push({
        type: "photo",
        media:
          game.image ||
          "https://via.placeholder.com/400x200/33363d/ffffff?text=Epic+Games",
        caption:
          index === 0
            ? this.formatGiveawayMessage(epicGames, steamGames)
            : undefined,
        parse_mode: "HTML",
      });
    });

    return media;
  }

  async sendGiveaway(epicGames, steamGames) {
    try {
      console.log(`📤 Відправляю повідомлення...`);
      console.log(
        `🎯 Epic Games: ${epicGames.filter((g) => g.isActive).length} активних`
      );
      console.log(`⚡ Steam: ${steamGames.length} ігор`);
      console.log(
        `📅 Майбутні: ${epicGames.filter((g) => !g.isActive).length}`
      );

      const epicActive = epicGames.filter((game) => game.isActive);

      // Відправляємо як медіа-групу якщо є фото з Epic Games
      if (epicActive.length >= 1 && epicActive[0].image) {
        const media = this.createMediaGroup(epicGames, steamGames);
        return await this.sendMediaGroup(media);
      } else {
        // Інакше текстове повідомлення
        const message = this.formatGiveawayMessage(epicGames, steamGames);
        return await this.sendMessage(message);
      }
    } catch (error) {
      console.error("❌ Помилка відправки:", error);
      return false;
    }
  }

  formatPSPlusMonthlyMessage(games, article) {
    const currentDate = new Date().toLocaleDateString("uk-UA", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    let message = `🎮 <b>НОВІ МІСЯЧНІ ІГРИ PS PLUS</b>\n`;
    message += `📅 <i>${currentDate}</i>\n\n`;

    if (article?.title) {
      message += `📰 <i>${article.title}</i>\n\n`;
    }

    message += `───────────────\n\n`;

    message += `🎯 <b>МІСЯЧНІ ІГРИ:</b>\n\n`;

    games.forEach((game, index) => {
      const endDate = game.endDate
        ? `⏰ До: <b>${new Date(game.endDate).toLocaleDateString(
            "uk-UA"
          )}</b>\n`
        : "";

      message += `${index + 1}. <b>${game.title}</b>\n`;
      message += `🎁 <b>Включено в PS Plus Essential</b>\n`;
      message += endDate;
      message += `\n`;
    });

    // Додаємо посилання на статтю один раз в кінці
    if (article?.url) {
      message += `\n🔗 <a href="${article.url}">Детальніше про місячні ігри</a>\n`;
    }

    message += `\n🔔 <i>Доступні для всіх підписників PS Plus</i>`;

    return message;
  }

  formatPSPlusCatalogMessage(games, article) {
    const currentDate = new Date().toLocaleDateString("uk-UA", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    let message = `🎮 <b>НОВІ ІГРИ В КАТАЛОЗІ PS PLUS</b>\n`;
    message += `📅 <i>${currentDate}</i>\n\n`;

    if (article?.title) {
      message += `📰 <i>${article.title}</i>\n\n`;
    }

    message += `───────────────\n\n`;

    message += `📚 <b>НОВИНКИ КАТАЛОГУ:</b>\n\n`;

    games.forEach((game, index) => {
      message += `${index + 1}. <b>${game.title}</b>\n`;
      message += `🎁 <b>Включено в PS Plus Extra/Premium</b>\n`;
      message += `\n`;
    });

    // Додаємо посилання на статтю один раз в кінці
    if (article?.url) {
      message += `🔗 <a href="${article.url}">Детальніше про ігри каталогу</a>\n`;
    }

    message += `\n🔔 <i>Доступні для підписників PS Plus Extra та Premium</i>`;

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
