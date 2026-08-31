// /api/telegram-webhook.js
// Telegram bot Update'larini qabul qiladi:
//  - /start → salomlashuv + doimiy pastki tugmalar (⭐ Premium, 📖 Manba)
//  - "⭐ Premium" tugmasi → Premium haqida ma'lumot
//  - "📖 Manba" tugmasi → "Manba" platformasi haqida ma'lumot
//
// MUHIM TUZATISH: parse_mode endi 'HTML' (Markdown emas) — chunki
// @AzadiB_way kabi pastki chiziqli so'zlar Markdown'da xato berib,
// xabarni butunlay yubormay qo'yardi.
//
// KERAKLI MUHIT O'ZGARUVCHISI (Vercel):
//   TELEGRAM_BOT_TOKEN — BotFather bergan token

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

    const message = update.message;
    if (!message || !message.text) {
      return res.status(200).json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();
    const firstName = message.from?.first_name || 'Tarbiyachi';

    if (text === '/start') {
      const result1 = await sendMessage(BOT_TOKEN, chatId, {
        text: `Assalomu alaykum, ${firstName}! 👋`
      });
      console.log('start msg1:', JSON.stringify(result1));

      const result2 = await sendMessage(BOT_TOKEN, chatId, {
        text:
          `MaktabgachaHub — tarbiyachilar uchun professional rivojlanish va attestatsiyaga tayyorgarlik platformasi.\n\n` +
          `📚 Test ishlash uchun chap pastdagi menyu tugmasini bosing.\n` +
          `⭐ Premium va 📖 Manba haqida ma'lumot uchun pastdagi tugmalardan foydalaning.`,
        reply_markup: MAIN_KEYBOARD
      });
      console.log('start msg2:', JSON.stringify(result2));
    } else if (text === PREMIUM_BTN || text === '/premium') {
      const result = await sendMessage(BOT_TOKEN, chatId, {
        text: PREMIUM_INFO_TEXT,
        parse_mode: 'HTML',
        reply_markup: MAIN_KEYBOARD
      });
      console.log('premium msg:', JSON.stringify(result));
    } else if (text === MANBA_BTN || text === '/manba') {
      const result = await sendMessage(BOT_TOKEN, chatId, {
        text: MANBA_INFO_TEXT,
        parse_mode: 'HTML',
        reply_markup: MAIN_KEYBOARD
      });
      console.log('manba msg:', JSON.stringify(result));
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
