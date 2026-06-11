const express = require("express");
const app = express();
app.use(express.json());

const BALE_TOKEN = process.env.BALE_TOKEN;
const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY;
const BALE_API = `https://tapi.bale.ai/bot${BALE_TOKEN}`;

// حافظه مکالمات (هر کاربر جداگانه)
const conversations = {};

const SYSTEM_PROMPT = `تو دستیار فروش هوشمند فروشگاه «نوین پوشش» هستی — مرکز پخش آنلاین محصولات پلی‌کربنات ایران.

📦 محصولات و قیمت‌ها:

بارانگیر و سایبان:
- مدل باران 80/100 → ۴٬۹۴۰٬۴۰۰ تومان
- مدل باران 100/100 → ۵٬۳۴۰٬۶۰۰ تومان
- مدل باران 100/120 → ۵٬۴۰۵٬۰۰۰ تومان
- مدل باران 150/100 → ۷٬۸۸۲٬۵۶۰ تومان
- مدل باران 100/200 → ۸٬۸۲۲٬۳۴۰ تومان
- مدل باران 150/200 → ۱۰٬۵۶۵٬۰۵۰ تومان
- مدل باران 80/700 → ۱۷٬۰۴۶٬۰۰۰ تومان
- مدل بیتا 80 → تماس بگیرید
- مدل بیتا 100/100 → ۵٬۴۹۹٬۳۰۰ تومان
- مدل بیتا 100 → ۶٬۵۹۹٬۱۶۰ تومان
- مدل بیتا 150 → ۹٬۳۶۱٬۹۲۰ تومان
- مدل بیتا 100/200 → ۹٬۳۵۲٬۹۵۰ تومان
- مدل بیتا 150/200 → ۱۳٬۱۴۵٬۰۰۰ تومان
- مدل بهار 80 → ۴٬۴۷۱٬۲۰۰ تومان
- مدل بهار 100 → ۵٬۶۷۱٬۸۰۰ تومان
- مدل بهار 150 → ۷٬۲۰۳٬۶۰۰ تومان
- براکت بارانگیر تک → ۲٬۲۸۰٬۰۰۰ تومان
- زهوار فیکسینگ 120 → ۸۹۶٬۹۹۹ تومان

ورق پلی‌کربنات:
- ورق دوجداره 6 میل (ابعاد مختلف) → از ۹۶۰٬۰۰۰ تومان
- ورق دوجداره 100/120 6 میل → ۵٬۰۴۰٬۰۰۰ تومان (ناموجود)
- ورق تخت (نشکن) 3 و 4 میل → تماس بگیرید

🔧 اجزای بارانگیر:
- براکت از جنس پلی‌آمید الیافدار (نشکن، مقاوم در هر آب‌وهوا)
- ورق پلی‌کربنات 5 یا 6 میل دوجداره / یا 3 یا 4 میل تخت
- زهوار فیکسینگ آلومینیوم (جلو و عقب)
- انکر بولت سایز 10 و پیچ اتصال
- پک کامل شامل همه اجزا می‌شود

🌐 سایت: novinpushesh.ir
📞 تماس: 09128468737
🚚 فروش کاملاً آنلاین — ارسال به سراسر ایران

قوانین پاسخ‌دهی:
- همیشه فارسی پاسخ بده
- پاسخ‌ها کوتاه، واضح و مفید باشند
- اگر سوال درباره ابعاد خاصی بود که در لیست نیست، بگو با شماره 09128468737 تماس بگیرند
- برای سفارش، مشتری رو به سایت novinpushesh.ir هدایت کن
- اگر پیام غیرمرتبط بود، مودبانه به محصولات برگرد`;

// ارسال پیام به بله
async function sendMessage(chatId, text) {
  await fetch(`${BALE_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

// پردازش پیام با Claude
async function getAIReply(userId, userMessage) {
  if (!conversations[userId]) conversations[userId] = [];
  conversations[userId].push({ role: "user", content: userMessage });

  // نگه‌داری حداکثر ۱۰ پیام آخر
  if (conversations[userId].length > 20) {
    conversations[userId] = conversations[userId].slice(-20);
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: conversations[userId],
    }),
  });

  const data = await response.json();
  const reply = data.content?.[0]?.text || "متأسفم، مشکلی پیش آمد.";
  conversations[userId].push({ role: "assistant", content: reply });
  return reply;
}

// webhook اصلی
app.post("/webhook", async (req, res) => {
  res.sendStatus(200);
  try {
    const update = req.body;
    const message = update.message;
    if (!message || !message.text) return;

    const chatId = message.chat.id;
    const userId = message.from.id;
    const text = message.text;

    // دستور /start
    if (text === "/start") {
      await sendMessage(
        chatId,
        `سلام! 👋 به فروشگاه نوین پوشش خوش آمدید.

من دستیار هوشمند این فروشگاه هستم و می‌توانم درباره محصولات زیر راهنماییتان کنم:

🔹 بارانگیر و سایبان پلی‌کربنات
🔹 ورق پلی‌کربنات (دوجداره، تخت)
🔹 نورگیر حبابی
🔹 قطعات و لوازم جانبی

سوال خود را بپرسید 👇`
      );
      return;
    }

    // پاسخ هوشمند
    const reply = await getAIReply(userId, text);
    await sendMessage(chatId, reply);
  } catch (err) {
    console.error("Error:", err);
  }
});

// health check
app.get("/", (_, res) => res.send("Bot is running ✅"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
