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
}
