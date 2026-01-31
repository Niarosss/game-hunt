import "dotenv/config";
import handler from "../api/check-games.js";

async function runLocally() {
  console.log("🚀 Запуск перевірки в локальному режимі...");

  const mockReq = {
    headers: { host: "localhost" },
    url: "/",
  };

  const mockRes = {
    status: (code) => {
      console.log(`\n✅ Завершено зі статусом: ${code}`);
      return mockRes;
    },
    json: (data) => {
      console.log("📝 Отримана відповідь JSON:");
      console.log(JSON.stringify(data, null, 2));
    },
  };

  try {
    await handler(mockReq, mockRes);
  } catch (e) {
    console.error("💥 Неперехоплена помилка під час локального запуску:", e);
  }
}

runLocally();
