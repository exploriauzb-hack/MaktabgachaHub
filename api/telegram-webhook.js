// /api/telegram-webhook.js
// Telegram bot Update'larini qabul qiladi (masalan /start buyrug'i)
// va foydalanuvchiga salomlashuv xabari + "Test ishlash" INLINE tugmasini yuboradi.
//
// MUHIM: tugma turi reply-keyboard emas, balki INLINE (xabarning o'ziga
// biriktirilgan) qilib qilingan — chunki Telegram Desktop'da reply-keyboard
// web_app tugmalari ba'zan initData'ni bo'sh yuboradi, inline tugma esa
// barcha platformalarda (Desktop, Mobile, Web) ishonchli ishlaydi.
//
// KERAKLI MUHIT O'ZGARUVCHILARI (Vercel):
//   TELEGRAM_BOT_TOKEN — BotFather bergan token
//   APP_URL             — masalan https://www.maktabgachahub.website (oxirida slash YO'Q)

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
      await sendMessage(BOT_TOKEN, chatId, {
        text:
          `Assalomu alaykum, ${firstName}! 👋\n\n` +
          `MaktabgachaHub — tarbiyachilar uchun professional rivojlanish va attestatsiyaga tayyorgarlik platformasi.\n\n` +
          `Test ishlash uchun pastdagi tugmani bosing 👇`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '📚 Test ishlash', web_app: { url: `${APP_URL}/telegram-login.html` } }]
          ]
        }
      });
    } else {
      await sendMessage(BOT_TOKEN, chatId, {
        text: 'Botdan foydalanish uchun /start buyrug\'ini yuboring yoki pastdagi tugmani bosing.'
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
