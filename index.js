require("dotenv").config();
const express = require("express");

const app = express();
app.use(express.json());

const BALE_TOKEN = process.env.BALE_TOKEN;
const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY;

const BALE_API = `https://tapi.bale.ai/bot${BALE_TOKEN}`;

const conversations = new Map();

const SYSTEM_PROMPT = `
تو دستیار فروش هوشمند فروشگاه نوین پوشش هستی.

سایت:
novinpushesh.ir

شماره تماس:
09128468737

قوانین:
- فقط فارسی پاسخ بده
- کوتاه و کاربردی جواب بده
- برای سفارش به سایت هدایت کن
- اگر ابعاد یا محصولی در اطلاعات موجود نبود، شماره تماس را اعلام کن
- اگر سوال نامرتبط بود مودبانه گفتگو را به محصولات برگردان
`;

function getConversation(userId) {
  if (!conversations.has(userId)) {
    conversations.set(userId, []);
  }
  return conversations.get(userId);
}

async function sendMessage(chatId, text) {
  try {
    await fetch(`${BALE_API}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
    });
  } catch (error) {
    console.error("Send Message Error:", error);
  }
}

async function getAIReply(userId, userMessage) {
  const history = getConversation(userId);

  history.push({
    role: "user",
    content: userMessage,
  });

  if (history.length > 20) {
    history.splice(0, history.length - 20);
  }

  try {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 30000);

    const response = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 800,
          temperature: 0.3,
          system: SYSTEM_PROMPT,
          messages: history,
        }),
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(
        `Anthropic Error: ${response.status}`
      );
    }

    const data = await response.json();

    const reply =
      data.content?.[0]?.text ||
      "متأسفم، پاسخی دریافت نشد.";

    history.push({
      role: "assistant",
      content: reply,
    });

    return reply;
  } catch (error) {
    console.error("Claude Error:", error);

    return "در حال حاضر سرور پاسخگو نیست، لطفاً چند لحظه دیگر مجدداً تلاش کنید.";
  }
}

app.post("/webhook", async (req, res) => {
  res.sendStatus(200);

  try {
    const update = req.body;

    if (!update?.message?.text) {
      return;
    }

    const chatId = update.message.chat.id;
    const userId = update.message.from.id;
    const text = update.message.text.trim();

    console.log(
      `[${new Date().toISOString()}]`,
      userId,
      text
    );

    if (text === "/start") {
      await sendMessage(
        chatId,
`سلام 👋

به فروشگاه نوین پوشش خوش آمدید.

خدمات:
✅ بارانگیر پلی کربنات
✅ سایبان پلی کربنات
✅ ورق پلی کربنات
✅ نورگیر حبابی
✅ لوازم جانبی

سوال خود را ارسال کنید.`
      );
      return;
    }

    const reply = await getAIReply(userId, text);

    await sendMessage(chatId, reply);
  } catch (error) {
    console.error("Webhook Error:", error);
  }
});

app.get("/", (req, res) => {
  res.status(200).send("Bot Running ✅");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server Running On ${PORT}`);
});
