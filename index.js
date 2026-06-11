const express = require("express");
const app = express();
app.use(express.json());

const BALE_TOKEN = process.env.BALE_TOKEN;
const GEMINI_KEY = process.env.GEMINI_KEY;
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
  conversations[userId].push({ role: "user", parts: [{ text: userMessage }] });
  if (conversations[userId].length > 20) {
    conversations[userId] = conversations[userId].slice(-20);
  }

  var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + GEMINI_KEY;

  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: conversations[userId],
    }),
  }).then(function(response) {
    return response.json();
  }).then(function(data) {
    console.log("Gemini response:", JSON.stringify(data));
    var reply = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
    if (!reply) {
      console.error("Gemini error:", JSON.stringify(data));
      return "متأسفم، مشکلی پیش آمد. با 09128468737 تماس بگیرید.";
    }
    conversations[userId].push({ role: "model", parts: [{ text: reply }] });
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

app.get("/", function(req, res) {
  res.send("Bot is running");
});

var PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
  console.log("Server running on port " + PORT);
});
