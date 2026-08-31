// /api/telegram-webhook.js
// Telegram bot Update'larini qabul qiladi:
//  - /start → salomlashuv + "🌐 Saytga o'tish" (Mini App) inline tugmasi
//             + doimiy pastki tugmalar (⭐ Premium, 📖 Manba)
//  - "⭐ Premium" tugmasi → Premium haqida ma'lumot
//  - "📖 Manba" tugmasi → "Manba" platformasi haqida ma'lumot
//
// MUHIM: "Saytga o'tish" INLINE tugma qilib qilingan (reply-keyboard emas),
// chunki reply-keyboard'dagi web_app tugmalari Telegram Desktop'da
// initData'ni bo'sh yuborardi (avval sinab ko'rilgan va tasdiqlangan xato).
// Inline tugma esa barcha platformalarda ishonchli ishlaydi.
//
// KERAKLI MUHIT O'ZGARUVCHILARI (Vercel):
//   TELEGRAM_BOT_TOKEN — BotFather bergan token
//   APP_URL             — masalan https://www.maktabgachahub.website (oxirida slash YO'Q)

const PREMIUM_BTN = '⭐ Premium';
const MANBA_BTN = '📖 Manba';

const PREMIUM_INFO_TEXT =
  `⭐ <b>Premium haqida</b>\n\n` +
  `MaktabgachaHub 3 ta tarifda ishlaydi:\n\n` +
  `🆓 <b>Bepul</b> — asosiy testlar va materiallarga kirish\n\n` +
  `⭐ <b>Professional</b> — 49 000 so'm/oy\n` +
  `— Barcha test va attestatsiya bo'limlari\n` +
  `— Qo'shiqlar, o'yinlar, mashg'ulotlar\n` +
  `— Cheksiz foydalanish\n\n` +
  `🎉 <b>5 oylik obuna — 60 000 so'm</b> (tejamli aksiya narxi)\n\n` +
  `Obuna bo'lish uchun @AzadiB_way ga yozing.`;

const MANBA_INFO_TEXT =
  `🔥 Qog'ozbozlik va izlanishga sarflanadigan soatlab vaqtingizni tejang!\n\n` +
  `"Manba" — tarbiyachilar uchun tayyor amaliy yechimlar va doimiy yangilanuvchi metodik adabiyotlar platformasi.\n\n` +
  `📚 Nol nazariya, 100% amaliyot: Aniq qadamlar va oson tushuntirilgan me'yoriy hujjatlar.\n\n` +
  `📝 Tezkor testlar: Bilimingizni darhol tekshirib, o'sishingizni kuzating.\n` +
  `⚡️ Doimiy yangilanish: Ishingiz uchun zarur barcha resurslar har doim qo'lingiz ostida.\n\n` +
  `Professional faoliyatingizni bugundanoq yengillashtiring!\n\n` +
  `Obunani faollashtirish uchun @AzadiB_way ga murojaat qiling.`;

const MAIN_KEYBOARD = {
  keyboard: [[{ text: PREMIUM_BTN }, { text: MANBA_BTN }]],
  resize_keyboard: true
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(200).send('OK');
  }

  try {
    const update = req.body;
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const APP_URL = process.env.APP_URL || 'https://www.maktabgachahub.website';

    const message = update.message;
    if (!message || !message.text) {
      return res.status(200).json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();
    const firstName = message.from?.first_name || 'Tarbiyachi';

    if (text === '/start') {
      // 1) Salomlashuv
      await sendMessage(BOT_TOKEN, chatId, {
        text: `Assalomu alaykum, ${firstName}! 👋`
      });

      // 2) Asosiy matn + INLINE "Saytga o'tish" tugmasi
      await sendMessage(BOT_TOKEN, chatId, {
        text:
          `MaktabgachaHub — tarbiyachilar uchun professional rivojlanish va attestatsiyaga tayyorgarlik platformasi.\n\n` +
          `Saytga o'tish uchun pastdagi tugmani bosing 👇`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🌐 Saytga o\'tish', web_app: { url: `${APP_URL}/telegram-login.html` } }]
          ]
        }
      });

      // 3) Doimiy pastki tugmalar (Premium / Manba)
      await sendMessage(BOT_TOKEN, chatId, {
        text: '⭐ Premium va 📖 Manba haqida ma\'lumot uchun pastdagi tugmalardan foydalaning.',
        reply_markup: MAIN_KEYBOARD
      });
    } else if (text === PREMIUM_BTN || text === '/premium') {
      await sendMessage(BOT_TOKEN, chatId, {
        text: PREMIUM_INFO_TEXT,
        parse_mode: 'HTML',
        reply_markup: MAIN_KEYBOARD
      });
    } else if (text === MANBA_BTN || text === '/manba') {
      await sendMessage(BOT_TOKEN, chatId, {
        text: MANBA_INFO_TEXT,
        parse_mode: 'HTML',
        reply_markup: MAIN_KEYBOARD
      });
    } else {
      await sendMessage(BOT_TOKEN, chatId, {
        text: 'Botdan foydalanish uchun /start buyrug\'ini yuboring yoki pastdagi tugmalardan foydalaning.',
        reply_markup: MAIN_KEYBOARD
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
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, ...payload })
  });
  return res.json();
}
