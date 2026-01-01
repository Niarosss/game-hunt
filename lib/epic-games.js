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

      const currentGames = games
        .filter((game) => {
          const isFree = game.price?.totalPrice?.discountPrice === 0;
          const hasPromotion = game.promotions?.promotionalOffers?.length > 0;
          return isFree && hasPromotion;
        })
        .map((game) => {
          const gameUrl = this.getGameUrl(game);
          const promotionData = this.getPromotionData(game);
          const priceData = this.getPriceData(game);
          const imageUrl = this.getGameImage(game);

          return {
            title: game.title,
            url: gameUrl,
            imageUrl,
            originalPrice: priceData.originalPrice,
            endDate: promotionData.endDate,
            id: game.id,
          };
        });

      console.log(
        `🎮 Epic Games: ${currentGames.length} поточних безкоштовних ігор`
      );
      return currentGames;
    } catch (error) {
      console.error("❌ Помилка Epic Games:", error);
      return [];
    }
  }

  getGameImage(game) {
    const images = game.keyImages || [];
    const offerImage = images.find((img) => img.type === "OfferImageWide");
    if (offerImage) return offerImage.url;
    const thumbnail = images.find((img) => img.type === "Thumbnail");
    if (thumbnail) return thumbnail.url;
    return null;
  }

  getPriceData(game) {
    const priceInfo = game.price?.totalPrice;

    if (!priceInfo) {
      return { originalPrice: null };
    }

    const originalPrice = priceInfo.fmtPrice?.originalPrice || "";

    return {
      originalPrice,
    };
  }

  getPromotionData(game) {
    const now = new Date();
    let startDate = null;
    let endDate = null;
    let isActive = false;

    // Тільки активні промоції
    const currentOffers = game.promotions?.promotionalOffers;
    if (currentOffers && currentOffers.length > 0) {
      const offers = currentOffers[0]?.promotionalOffers;
      if (offers && offers.length > 0) {
        startDate = new Date(offers[0].startDate);
        endDate = new Date(offers[0].endDate);
        isActive = now >= startDate && now <= endDate;
      }
    }

    return { endDate, isActive };
  }

  getGameUrl(game) {
    const isBundle = game.categories?.some((cat) => cat.path === "bundles");
    const path = isBundle ? "/bundles/" : "/p/";

    if (game.offerMappings && game.offerMappings.length > 0) {
      const pageSlug = game.offerMappings[0]?.pageSlug;
      if (pageSlug) return `https://store.epicgames.com/uk${path}${pageSlug}`;
    }

    if (game.catalogNs?.mappings && game.catalogNs.mappings.length > 0) {
      const pageSlug = game.catalogNs.mappings[0]?.pageSlug;
      if (pageSlug) return `https://store.epicgames.com/uk${path}${pageSlug}`;
    }

    if (game.productSlug && !game.productSlug.includes("/home")) {
      const cleanSlug = game.productSlug.replace(/-\d{4}-\d{2}-\d{2}$/, "");
      return `https://store.epicgames.com/uk${path}${cleanSlug}`;
    }

    return `https://store.epicgames.com/uk/search?q=${encodeURIComponent(
      game.title
    )}`;
  }
}
