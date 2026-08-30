// /api/telegram-webhook.js
// Telegram bot Update'larini qabul qiladi (masalan /start buyrug'i)
// va foydalanuvchiga salomlashuv xabari + "Test ishlash" tugmasini yuboradi.
//
// KERAKLI MUHIT O'ZGARUVCHISI (Vercel):
//   TELEGRAM_BOT_TOKEN — BotFather bergan token (telegram-auth.js bilan bir xil)
//
// O'RNATISHDAN KEYIN QILISH KERAK BO'LGAN ISH:
// Bu faylni deploy qilgach, Telegram'ga "mening update'larni shu manzilga yubor"
// deb BIR MARTA aytishingiz kerak — buni brauzeringiz manzil qatoriga
// quyidagi URL'ni ochib bajarasiz (TOKEN va DOMENni almashtiring):
//
//   https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://domeningiz.uz/api/telegram-webhook
//
// Muvaffaqiyatli bo'lsa {"ok":true,"result":true,...} degan javob chiqadi.

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(200).send('OK'); // Telegram GET bilan tekshirmaydi, lekin xavfsizlik uchun
  }

  try {
    const update = req.body;
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const APP_URL = process.env.APP_URL || 'https://maktabgachahub.website';

    const message = update.message;
    if (!message || !message.text) {
      return res.status(200).json({ ok: true }); // e'tiborsiz qoldiramiz
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
          keyboard: [
            [{ text: '📚 Test ishlash', web_app: { url: `${APP_URL}/telegram-login.html` } }]
          ],
          resize_keyboard: true
        }
      });
    } else {
      // boshqa har qanday matn uchun oddiy javob
      await sendMessage(BOT_TOKEN, chatId, {
        text: 'Botdan foydalanish uchun /start buyrug\'ini yuboring yoki pastdagi tugmani bosing.'
      });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('telegram-webhook xatolik:', e);
    return res.status(200).json({ ok: true }); // Telegram'ga baribir 200 qaytaramiz, aks holda qayta-qayta yuboraveradi
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
