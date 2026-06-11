const express = require("express");
const app = express();
app.use(express.json());

const BALE_TOKEN = process.env.BALE_TOKEN;
const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY;
const BALE_API = `https://tapi.bale.ai/bot${BALE_TOKEN}`;

const conversations = {};

const SYSTEM_PROMPT = `تو دستیار فروش هوشمند فروشگاه «نوین پوشش» هستی — مرکز پخش آنلاین محصولات پلی‌کربنات ایران.

محصولات و قیمت‌ها:
- مدل باران 80/100: ۴٬۹۴۰٬۴۰۰ تومان
- مدل باران 100/100: ۵٬۳۴۰٬۶۰۰ تومان
- مدل باران 100/120: ۵٬۴۰۵٬۰۰۰ تومان
- مدل باران 150/100: ۷٬۸۸۲٬۵۶۰ تومان
- مدل باران 100/200: ۸٬۸۲۲٬۳۴۰ تومان
- مدل باران 150/200: ۱۰٬۵۶۵٬۰۵۰ تومان
- مدل بیتا 100: ۶٬۵۹۹٬۱۶۰ تومان
- مدل بیتا 150: ۹٬۳۶۱٬۹۲۰ تومان
- مدل بهار 80: ۴٬۴۷۱٬۲۰۰ تومان
- مدل بهار 100: ۵٬۶۷۱٬۸۰۰ تومان
- مدل بهار 150: ۷٬۲۰۳٬۶۰۰ تومان
- براکت بارانگیر تک: ۲٬۲۸۰٬۰۰۰ تومان
- ورق پلی‌کربنات دوجداره 6 میل: از ۹۶۰٬۰۰۰ تومان

سایت: novinpushesh.ir
تماس: 09128468737
فروش آنلاین - ارسال به سراسر ایران

قوانین: همیشه فارسی پاسخ بده. پاسخ کوتاه و مفید باشد.`;

function sendMessage(chatId, text) {
  return fetch(`${BALE_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: text }),
  }).catch(function(e) {
    console.error("sendMessage error:", e.message);
  });
}

function getAIReply(userId, userMessage) {
  if (!conversations[userId]) {
    conversations[userId] = [];
  }
  conversations[userId].push({ role: "user", content: userMessage });
  if (conversations[userId].length > 20) {
    conversations[userId] = conversations[userId].slice(-20);
  }

  return fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: conversations[userId],
    }),
  }).then(function(response) {
    return response.json();
  }).then(function(data) {
    console.log("Anthropic response:", JSON.stringify(data));
    if (data.error) {
      console.error("Anthropic error:", JSON.stringify(data.error));
      return "متأسفم، مشکلی پیش آمد. با 09128468737 تماس بگیرید.";
    }
    var reply = (data.content && data.content[0] && data.content[0].text) || "متأسفم، مشکلی پیش آمد.";
    conversations[userId].push({ role: "assistant", content: reply });
    return reply;
  });
}

app.post("/webhook", function(req, res) {
  res.sendStatus(200);
  var update = req.body;
  console.log("Received:", JSON.stringify(update));

  var message = update.message;
  if (!message || !message.text) return;

  var chatId = message.chat.id;
  var userId = message.from.id;
  var text = message.text;

  if (text === "/start") {
    sendMessage(chatId, "سلام! به نوین پوشش خوش آمدید.\n\nمحصولات ما:\n- بارانگیر پلی‌کربنات\n- ورق پلی‌کربنات\n- نورگیر حبابی\n\nسوال خود را بپرسید.");
    return;
  }

  getAIReply(userId, text).then(function(reply) {
    return sendMessage(chatId, reply);
  }).catch(function(err) {
    console.error("Error:", err.message);
    sendMessage(chatId, "متأسفم، مشکلی پیش آمد. با 09128468727 تماس بگیرید.");
  });
});

app.get("/", function(req, res) {
  res.send("Bot is running");
});

var PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
  console.log("Server running on port " + PORT);
});
