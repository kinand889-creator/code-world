const express = require('express');
const { Client } = require('discord.js');
const app = express();

// --- صفحة الويب لـ UptimeRobot ---
app.get('/', (req, res) => {
  res.send('Code World Hosting is Online! 🚀');
});

app.listen(3000, () => console.log("لوحة التحكم جاهزة"));

// --- تشغيل بوتاتك الخاصة هنا ---
const bots = [
  'TOKEN_BOT_1',
  'TOKEN_BOT_2'
];

bots.forEach((token, index) => {
  const client = new Client({ intents: [32767] });
  client.login(token)
    .then(() => console.log(`✅ Bot ${index + 1} is running`))
    .catch(err => console.error(`❌ Bot ${index + 1} failed`));
});
