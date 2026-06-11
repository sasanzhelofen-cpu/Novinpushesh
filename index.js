const express = require("express");
const app = express();
app.use(express.json());

const BALE_TOKEN = process.env.BALE_TOKEN;
const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
const BALE_API = "https://tapi.bale.ai/bot" + BALE_TOKEN;

const conversations = {};

const SYSTEM_PROMPT = "تو دستیار فروش هوشمند فروشگاه نوین پوشش هستی — مرکز پخش آنلاین محصولات پلی‌کربنات ایران.\n\nمحصولات و قیمت‌ها:\n- مدل باران 80/100: 4940400 تومان\n- مدل باران 100/100: 5340600 تومان\n- مدل باران 100/120: 5405000 تومان\n- مدل باران 150/100: 7882560 تومان\n- مدل باران 100/200: 8822340 تومان\n- مدل باران 150/200: 10565050 تومان\n- مدل بیتا 100: 6599160 تومان\n- مدل بیتا 150: 9361920 تومان\n- مدل بهار 80: 4471200 تومان\n- مدل بهار 100: 5671800 تومان\n- مدل بهار 150: 7203600 تومان\n- براکت بارانگیر تک: 2280000 تومان\n- ورق پلی‌کربنات دوجداره 6 میل: از 960000 تومان\n\nسایت: novinpushesh.ir\nتماس: 09128468737\nفروش آنلاین - ارسال به سراسر ایران\n\nهمیشه فارسی پاسخ بده. پاسخ کوتاه و مفید باشد.";

function sendMessage(chatId, text) {
  return fetch(BALE_API + "/sendMessage", {
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

  return fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + OPENROUTER_KEY,
      "HTTP-Referer": "https://novinpushesh.vercel.app",
      "X-Title": "Novin Pushesh Bot",
    },
    body: JSON.stringify({
      model: "meta-llama/llama-3.1-8b-instruct:free",
      messages: [{ role: "system", content: SYSTEM_PROMPT }].concat(conversations[userId]),
    }),
  }).then(function(response) {
    return response.json();
  }).then(function(data) {
    console.log("OpenRouter response:", JSON.stringify(data));
    var reply = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!reply) {
      console.error("OpenRouter error:", JSON.stringify(data));
      return "متأسفم، مشکلی پیش آمد. با 09128468737 تماس بگیرید.";
    }
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
    sendMessage(chatId, "متأسفم، مشکلی پیش آمد. با 09128468737 تماس بگیرید.");
  });
});

app.get("/", function(req, res) {
  res.send("Bot is running");
});

var PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
  console.log("Server running on port " + PORT);
});
