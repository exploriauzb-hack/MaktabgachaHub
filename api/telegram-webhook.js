// /api/telegram-webhook.js
// Telegram bot Update'larini qabul qiladi:
//  - /start → oddiy salomlashuv matni (Test ishlash uchun BotFather Menu Button ishlatiladi)
//  - /premium → Premium haqida ma'lumot
//  - /manba → "Manba" platformasi haqida ma'lumot
//
// Bu 3 ta buyruq Telegram botning "menyu" ro'yxatida (input maydoni yonidagi
// "/" yoki menyu belgisi orqali) ko'rinadi — endi xabar ostidagi tugmalar
// shart emas.
//
// KERAKLI MUHIT O'ZGARUVCHISI (Vercel):
//   TELEGRAM_BOT_TOKEN — BotFather bergan token

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

      await sendMessage(BOT_TOKEN, chatId, {
        text:
          `MaktabgachaHub — tarbiyachilar uchun professional rivojlanish va attestatsiyaga tayyorgarlik platformasi.\n\n` +
          `📚 Test ishlash uchun chap pastdagi menyu tugmasini bosing.\n` +
          `⭐ Premium va 📖 Manba haqida ma'lumot uchun "/" menyusidan foydalaning.`
      });
    } else if (text === '/premium') {
      await sendMessage(BOT_TOKEN, chatId, { text: PREMIUM_INFO_TEXT, parse_mode: 'Markdown' });
    } else if (text === '/manba') {
      await sendMessage(BOT_TOKEN, chatId, { text: MANBA_INFO_TEXT, parse_mode: 'Markdown' });
    } else {
      await sendMessage(BOT_TOKEN, chatId, {
        text: 'Mavjud buyruqlar: /start, /premium, /manba — yoki chap pastdagi menyu tugmasidan foydalaning.'
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
