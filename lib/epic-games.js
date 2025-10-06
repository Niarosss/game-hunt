import axios from "axios";

export class EpicGames {
  constructor() {
    this.baseURL = "https://store-site-backend-static.ak.epicgames.com";
  }

  async getFreeGames() {
    try {
      const response = await axios.get(
        `${this.baseURL}/freeGamesPromotions?locale=uk-UA&country=UA&allowCountries=UA`
      );

      const games = response.data?.data?.Catalog?.searchStore?.elements || [];

      console.log(`🔍 Epic Games: знайдено ${games.length} ігор`);

      const allGames = games
        .filter((game) => {
          const isFree = game.price?.totalPrice?.discountPrice === 0;
          const hasPromotion =
            game.promotions?.promotionalOffers?.length > 0 ||
            game.promotions?.upcomingPromotionalOffers?.length > 0;
          return isFree && hasPromotion;
        })
        .map((game) => {
          const gameUrl = this.getGameUrl(game);
          const promotionData = this.getPromotionData(game);
          const priceData = this.getPriceData(game);

          return {
            title: game.title,
            description: game.description,
            url: gameUrl,
            originalPrice: priceData.originalPrice,
            hasMeaningfulPrice: priceData.hasMeaningfulPrice,
            startDate: promotionData.startDate,
            endDate: promotionData.endDate,
            image: this.getGameImage(game),
            platform: "Epic Games",
            id: game.id,
            isActive: promotionData.isActive,
          };
        });

      console.log(`🎮 Epic Games: ${allGames.length} безкоштовних ігор`);
      return allGames;
    } catch (error) {
      console.error("❌ Помилка Epic Games:", error);
      return [];
    }
  }

  getPriceData(game) {
    const priceInfo = game.price?.totalPrice;

    if (!priceInfo) {
      return { originalPrice: null, hasMeaningfulPrice: false };
    }

    const originalPrice = priceInfo.fmtPrice?.originalPrice || "";
    const originalPriceNumber = priceInfo.originalPrice;

    // Визначаємо чи ціна має сенс для показу
    // Показуємо тільки якщо це не 0 і не порожній рядок
    const hasMeaningfulPrice =
      originalPriceNumber > 0 &&
      originalPrice !== "" &&
      originalPrice !== "0" &&
      originalPrice !== "0₴";

    console.log(
      `💰 ${game.title}: ${originalPrice} (має сенс: ${hasMeaningfulPrice})`
    );

    return {
      originalPrice,
      hasMeaningfulPrice,
    };
  }

  getPromotionData(game) {
    const now = new Date();
    let startDate = null;
    let endDate = null;
    let isActive = false;

    // Активні промоції
    const currentOffers = game.promotions?.promotionalOffers;
    if (currentOffers && currentOffers.length > 0) {
      const offers = currentOffers[0]?.promotionalOffers;
      if (offers && offers.length > 0) {
        startDate = new Date(offers[0].startDate);
        endDate = new Date(offers[0].endDate);
        isActive = now >= startDate && now <= endDate;
      }
    }

    // Майбутні промоції
    const upcomingOffers = game.promotions?.upcomingPromotionalOffers;
    if (upcomingOffers && upcomingOffers.length > 0) {
      const offers = upcomingOffers[0]?.promotionalOffers;
      if (offers && offers.length > 0) {
        const upcomingStartDate = new Date(offers[0].startDate);
        if (now < upcomingStartDate) {
          startDate = upcomingStartDate;
          endDate = new Date(offers[0].endDate);
          isActive = false;
        }
      }
    }

    return { startDate, endDate, isActive };
  }

  getGameUrl(game) {
    if (game.offerMappings && game.offerMappings.length > 0) {
      const pageSlug = game.offerMappings[0]?.pageSlug;
      if (pageSlug) return `https://store.epicgames.com/uk/p/${pageSlug}`;
    }

    if (game.catalogNs?.mappings && game.catalogNs.mappings.length > 0) {
      const pageSlug = game.catalogNs.mappings[0]?.pageSlug;
      if (pageSlug) return `https://store.epicgames.com/uk/p/${pageSlug}`;
    }

    if (game.productSlug && !game.productSlug.includes("/home")) {
      const cleanSlug = game.productSlug.replace(/-\d{4}-\d{2}-\d{2}$/, "");
      return `https://store.epicgames.com/uk/p/${cleanSlug}`;
    }

    return `https://store.epicgames.com/uk/search?q=${encodeURIComponent(
      game.title
    )}`;
  }

  getGameImage(game) {
    return (
      game.keyImages?.find((img) => img.type === "Thumbnail")?.url ||
      game.keyImages?.find((img) => img.type === "OfferImageWide")?.url ||
      game.keyImages?.[0]?.url
    );
  }
}
