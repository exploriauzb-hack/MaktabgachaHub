// /api/send-reminders.js
// Kuniga 2 marta (ertalab va kechqurun) BARCHA obunachilarga
// "qaytarish" (re-engagement) xabarini yuboradi.
// Har safar matn tasodifiy tanlanadi — bir xillikdan qochish uchun.
//
// KERAKLI MUHIT O'ZGARUVCHILARI (Vercel):
//   TELEGRAM_BOT_TOKEN        — BotFather bergan token
//   APP_URL                    — masalan https://www.maktabgachahub.website
//   SUPABASE_URL               — loyihangiz URL manzili
//   SUPABASE_SERVICE_ROLE_KEY  — Supabase service_role kaliti
//   CRON_SECRET                — o'zingiz o'ylab topgan maxfiy satr
//                                (faqat Vercel Cron chaqira olishi uchun himoya)
//
// VERCEL CRON SOZLASH (vercel.json faylingizga qo'shing):
//   {
//     "crons": [
//       { "path": "/api/send-reminders?slot=morning", "schedule": "0 4 * * *" },
//       { "path": "/api/send-reminders?slot=evening", "schedule": "0 13 * * *" }
//     ]
//   }
//   Eslatma: Vercel Cron vaqtlari UTC bo'yicha. O'zbekiston vaqti UTC+5,
//   shuning uchun "0 4 * * *" — mahalliy soat 09:00, "0 13 * * *" — 18:00 ga to'g'ri keladi.
//   Xohlasangiz vaqtni o'zgartiring.

const { createClient } = require('@supabase/supabase-js');

// Har bir matn oxirida Premium'ga nozik, majburlamaydigan taklif bor —
// shunchaki eslatib o'tadi, hech kimni bezovta qilmaydi.
const PREMIUM_NUDGE =
  `\n\n💡 <i>Premium'da barcha testlar, qo'shiqlar va mashg'ulotlar cheksiz ochiq — ` +
  `hali ulanmagan bo'lsangiz, pastdagi ⭐ tugma orqali bir daqiqada qo'shilishingiz mumkin.</i>`;

const MORNING_MESSAGES = [
  (name) =>
    `Xayrli tong, ${name}! 🌅\n\n` +
    `Yangi kun — yangi imkoniyat. Siz uchun yangi testlar tayyor turibdi, ` +
    `faqat bir bosish qoldi 📖✨` +
    PREMIUM_NUDGE,
  (name) =>
    `Assalomu alaykum, ${name}! ☀️\n\n` +
    `Eng yaxshi tarbiyachilar har kuni ozgina bo'lsa ham o'z ustida ishlaydi. ` +
    `Bugun ham 5 daqiqa ajratib, bitta testni yechib ko'rasizmi? 💪` +
    PREMIUM_NUDGE,
  (name) =>
    `${name}, xayrli tong! 🌸\n\n` +
    `Attestatsiyaga tayyorgarlik — bu marafon, sprint emas. ` +
    `Bugungi kichik qadamingiz ertangi katta natijaga aylanadi 📚` +
    PREMIUM_NUDGE,
  (name) =>
    `Salom, ${name}! 🌞\n\n` +
    `Bilim — eng ishonchli hamroh. Kuningizni foydali narsa bilan boshlang: ` +
    `yangi test allaqachon sizni kutmoqda 🚀` +
    PREMIUM_NUDGE
];

const EVENING_MESSAGES = [
  (name) =>
    `${name}, kun qanday o'tdi? 🌇\n\n` +
    `Ish tashvishlaridan ozgina bo'shab, o'zingizga vaqt ajrating — ` +
    `bitta test, bir necha daqiqa, katta farq 💫` +
    PREMIUM_NUDGE,
  (name) =>
    `Assalomu alaykum, ${name}! 🌆\n\n` +
    `Bir muddat sizni ko'rmadik — sog'indik! Siz ketganingizdan beri ` +
    `platformamizda yangi materiallar paydo bo'ldi. Qaytib, ko'rib qo'yasizmi? 📖` +
    PREMIUM_NUDGE,
  (name) =>
    `${name}, kun yakunlanmoqda 🌙\n\n` +
    `Uxlashdan oldin ustozlarcha odat: bitta test — kichik, lekin muntazam qadam. ` +
    `Bugun ham buni davom ettiramizmi? ✅` +
    PREMIUM_NUDGE,
  (name) =>
    `Xayrli kech, ${name}! ✨\n\n` +
    `Har kuni ozgina o'sish — bir yilda katta natija demakdir. ` +
    `Bugungi ulushingizni qo'lga kiriting 🏆` +
    PREMIUM_NUDGE
];

module.exports = async (req, res) => {
  try {
    const CRON_SECRET = process.env.CRON_SECRET;
    const authHeader = req.headers['authorization'] || '';
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return res.status(401).json({ error: 'Ruxsat yo\'q' });
    }

    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const APP_URL = process.env.APP_URL || 'https://www.maktabgachahub.website';

    const slot = (req.query && req.query.slot) || 'morning';
    const pool = slot === 'evening' ? EVENING_MESSAGES : MORNING_MESSAGES;

    const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: subscribers, error } = await supabaseAdmin
      .from('telegram_subscribers')
      .select('chat_id, first_name');

    if (error || !subscribers) {
      return res.status(500).json({ error: 'Obunachilarni olishda xatolik', details: error?.message });
    }

    let sent = 0;
    let failed = 0;

    for (const sub of subscribers) {
      try {
        const name = sub.first_name || 'Tarbiyachi';
        const template = pool[Math.floor(Math.random() * pool.length)];
        const text = template(name);

        const result = await sendMessage(BOT_TOKEN, sub.chat_id, {
          text,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📚 Testlarni ochish', web_app: { url: `${APP_URL}/telegram-login.html` } }],
              [{ text: '⭐ Premium olish', url: 'https://t.me/AzadiB_way' }]
            ]
          }
        });

        if (result && result.ok) sent++;
        else failed++;
      } catch (e) {
        failed++;
      }
      // Telegram flood-limit'ga tegmaslik uchun ozgina kutamiz
      await new Promise((r) => setTimeout(r, 40));
    }

    return res.status(200).json({ ok: true, slot, total: subscribers.length, sent, failed });
  } catch (e) {
    console.error('send-reminders xatolik:', e);
    return res.status(500).json({ error: 'Kutilmagan server xatoligi' });
  }
};

async function sendMessage(botToken, chatId, payload) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, ...payload })
  });
  return res.json();
}
