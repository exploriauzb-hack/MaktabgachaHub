// /api/telegram-webhook.js
// Telegram bot Update'larini qabul qiladi:
//  - /start buyrug'i → salomlashuv + 3 ta inline tugma
//  - "premium_info" / "manba_info" callback tugmalari → ma'lumot xabari
//
// KERAKLI MUHIT O'ZGARUVCHILARI (Vercel):
//   TELEGRAM_BOT_TOKEN — BotFather bergan token
//   APP_URL             — masalan https://www.maktabgachahub.website (oxirida slash YO'Q)

const PREMIUM_INFO_TEXT =
  `⭐ *Premium haqida*\n\n` +
  `MaktabgachaHub 3 ta tarifda ishlaydi:\n\n` +
  `🆓 *Bepul* — asosiy testlar va materiallarga kirish\n\n` +
  `⭐ *Professional* — 49 000 so'm/oy\n` +
  `— Barcha test va attestatsiya bo'limlari\n` +
  `— Qo'shiqlar, o'yinlar, mashg'ulotlar\n` +
  `— Cheksiz foydalanish\n\n` +
  `🎉 *5 oylik obuna — 60 000 so'm* (tejamli aksiya narxi)\n\n` +
  `Obuna bo'lish uchun @AzadiB_way ga yozing.`;

const MANBA_INFO_TEXT =
  `🔥 Qog'ozbozlik va izlanishga sarflanadigan soatlab vaqtingizni tejang!\n\n` +
  `"Manba" — tarbiyachilar uchun tayyor amaliy yechimlar va doimiy yangilanuvchi metodik adabiyotlar platformasi.\n\n` +
  `📚 Nol nazariya, 100% amaliyot: Aniq qadamlar va oson tushuntirilgan me'yoriy hujjatlar.\n\n` +
  `📝 Tezkor testlar: Bilimingizni darhol tekshirib, o'sishingizni kuzating.\n` +
  `⚡️ Doimiy yangilanish: Ishingiz uchun zarur barcha resurslar har doim qo'lingiz ostida.\n\n` +
  `Professional faoliyatingizni bugundanoq yengillashtiring!\n\n` +
  `Obunani faollashtirish uchun @AzadiB_way ga murojaat qiling.`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(200).send('OK');
  }

  try {
    const update = req.body;
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const APP_URL = process.env.APP_URL || 'https://www.maktabgachahub.website';

    // ═══ Callback tugmalar (Premium / Manba) ═══
    if (update.callback_query) {
      const cq = update.callback_query;
      const chatId = cq.message.chat.id;
      const data = cq.data;

      await answerCallbackQuery(BOT_TOKEN, cq.id);

      if (data === 'premium_info') {
        await sendMessage(BOT_TOKEN, chatId, { text: PREMIUM_INFO_TEXT, parse_mode: 'Markdown' });
      } else if (data === 'manba_info') {
        await sendMessage(BOT_TOKEN, chatId, { text: MANBA_INFO_TEXT, parse_mode: 'Markdown' });
      }

      return res.status(200).json({ ok: true });
    }

    // ═══ Oddiy xabarlar (/start va h.k.) ═══
    const message = update.message;
    if (!message || !message.text) {
      return res.status(200).json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();
    const firstName = message.from?.first_name || 'Tarbiyachi';

    if (text === '/start') {
      // Eski pastki klaviaturani (agar bo'lsa) tozalaymiz
      await sendMessage(BOT_TOKEN, chatId, {
        text: `Assalomu alaykum, ${firstName}! 👋`,
        reply_markup: { remove_keyboard: true }
      });

      // Asosiy xabar + 3 ta inline tugma
      await sendMessage(BOT_TOKEN, chatId, {
        text:
          `MaktabgachaHub — tarbiyachilar uchun professional rivojlanish va attestatsiyaga tayyorgarlik platformasi.\n\n` +
          `Test ishlash uchun pastdagi tugmani bosing 👇`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '📚 Test ishlash', web_app: { url: `${APP_URL}/telegram-login.html` } }],
            [{ text: '⭐ Premium haqida', callback_data: 'premium_info' }],
            [{ text: '📖 "Manba" platformasi haqida', callback_data: 'manba_info' }]
          ]
        }
      });
    } else {
      await sendMessage(BOT_TOKEN, chatId, {
        text: 'Botdan foydalanish uchun /start buyrug\'ini yuboring yoki yuqoridagi xabar ostidagi tugmalardan foydalaning.'
      });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('telegram-webhook xatolik:', e);
    return res.status(200).json({ ok: true });
  }
};

async function sendMessage(botToken, chatId, payload) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, ...payload })
  });
}

async function answerCallbackQuery(botToken, callbackQueryId) {
  const url = `https://api.telegram.org/bot${botToken}/answerCallbackQuery`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId })
  });
}
