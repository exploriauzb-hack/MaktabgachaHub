// /api/telegram-webhook.js
// TEZLASHTIRISH UCHUN QILINGAN O'ZGARISHLAR:
//  1) checkChannelMembership va saveSubscriber endi PARALLEL (Promise.all) —
//     avval ketma-ket edi, endi ikkisi bir vaqtda bajariladi.
//  2) /start endi 3 ta emas, 2 ta xabar yuboradi (salomlashuv + saytga
//     o'tish tugmasi bitta xabarga birlashtirildi, ikkinchi xabar parallel).
//  3) saveSubscriber faqat /start'da chaqiriladi, har bir xabarda emas —
//     keraksiz baza yozuvlarini kamaytiradi.
//
// KERAKLI MUHIT O'ZGARUVCHILARI (Vercel):
//   TELEGRAM_BOT_TOKEN        — BotFather bergan token
//   APP_URL                    — masalan https://www.maktabgachahub.website
//   SUPABASE_URL               — loyihangiz URL manzili
//   SUPABASE_SERVICE_ROLE_KEY  — Supabase service_role kaliti
//   ADMIN_TELEGRAM_ID          — sizning shaxsiy Telegram ID raqamingiz
//   CHANNEL_USERNAME           — masalan @MaktabgachaHub

const { createClient } = require('@supabase/supabase-js');

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
    const ADMIN_ID = process.env.ADMIN_TELEGRAM_ID;
    const CHANNEL_USERNAME = process.env.CHANNEL_USERNAME || '@MaktabgachaHub';

    // ═══ "✅ Tekshirish" tugmasi (callback) ═══
    if (update.callback_query) {
      const cq = update.callback_query;
      const chatId = cq.message.chat.id;
      const senderId = cq.from.id;
      const firstName = cq.from.first_name || 'Tarbiyachi';

      const results = await Promise.all([
        answerCallbackQuery(BOT_TOKEN, cq.id),
        checkChannelMembership(BOT_TOKEN, CHANNEL_USERNAME, senderId)
      ]);
      const isMember = results[1];

      if (cq.data === 'check_subscription') {
        if (isMember) {
          await sendWelcomeFlow(BOT_TOKEN, chatId, firstName, APP_URL);
        } else {
          await sendSubscribeGate(BOT_TOKEN, chatId, CHANNEL_USERNAME);
        }
      }
      return res.status(200).json({ ok: true });
    }

    const message = update.message;
    if (!message || !message.text) {
      return res.status(200).json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();
    const firstName = message.from?.first_name || 'Tarbiyachi';
    const username = message.from?.username || null;
    const senderId = message.from?.id;

    // ═══ ADMIN: e'lon yuborish ═══
    if (text.startsWith('/elon')) {
      if (!ADMIN_ID || String(senderId) !== String(ADMIN_ID)) {
        await sendMessage(BOT_TOKEN, chatId, { text: 'Bu buyruq faqat admin uchun.' });
        return res.status(200).json({ ok: true });
      }
      const announceText = text.replace('/elon', '').trim();
      if (!announceText) {
        await sendMessage(BOT_TOKEN, chatId, {
          text: 'Foydalanish: /elon Xabar matni\n\nMasalan: /elon Yangi test bo\'limi qo\'shildi!'
        });
        return res.status(200).json({ ok: true });
      }
      const result = await broadcastToAll(BOT_TOKEN, announceText);
      await sendMessage(BOT_TOKEN, chatId, {
        text: `✅ E'lon yuborildi.\nJami obunachi: ${result.total}\nYuborildi: ${result.sent}\nXato (bloklangan/o'chirilgan): ${result.failed}`
      });
      return res.status(200).json({ ok: true });
    }

    if (text === '/start') {
      const results = await Promise.all([
        checkChannelMembership(BOT_TOKEN, CHANNEL_USERNAME, senderId),
        saveSubscriber(chatId, senderId, firstName, username)
      ]);
      const isMember = results[0];

      if (isMember) {
        await sendWelcomeFlow(BOT_TOKEN, chatId, firstName, APP_URL);
      } else {
        await sendSubscribeGate(BOT_TOKEN, chatId, CHANNEL_USERNAME);
      }
    } else if (text === PREMIUM_BTN || text === '/premium') {
      await sendMessage(BOT_TOKEN, chatId, { text: PREMIUM_INFO_TEXT, parse_mode: 'HTML', reply_markup: MAIN_KEYBOARD });
    } else if (text === MANBA_BTN || text === '/manba') {
      await sendMessage(BOT_TOKEN, chatId, { text: MANBA_INFO_TEXT, parse_mode: 'HTML', reply_markup: MAIN_KEYBOARD });
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

// Endi 2 ta xabar (avval 3 ta edi), ikkisi PARALLEL jo'natiladi
async function sendWelcomeFlow(botToken, chatId, firstName, appUrl) {
  await Promise.all([
    sendMessage(botToken, chatId, {
      text:
        `Assalomu alaykum, ${firstName}! 👋\n\n` +
        `MaktabgachaHub — tarbiyachilar uchun professional rivojlanish va attestatsiyaga tayyorgarlik platformasi.\n\n` +
        `Saytga o'tish uchun pastdagi tugmani bosing 👇`,
      reply_markup: {
        inline_keyboard: [
          [{ text: '🌐 Saytga o\'tish', web_app: { url: `${appUrl}/telegram-login.html` } }]
        ]
      }
    }),
    sendMessage(botToken, chatId, {
      text: '⭐ Premium va 📖 Manba haqida ma\'lumot uchun pastdagi tugmalardan foydalaning.',
      reply_markup: MAIN_KEYBOARD
    })
  ]);
}

async function sendSubscribeGate(botToken, chatId, channelUsername) {
  const channelLink = `https://t.me/${channelUsername.replace('@', '')}`;
  await sendMessage(botToken, chatId, {
    text:
      `📢 <b>Diqqat:</b> saytdan foydalanish uchun avval ${channelUsername} kanaliga a'zo bo'lishingiz kerak.\n\n` +
      `A'zo bo'lgach, pastdagi "✅ Tekshirish" tugmasini bosing.`,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: '📢 Kanalga o\'tish', url: channelLink }],
        [{ text: '✅ Tekshirish', callback_data: 'check_subscription' }]
      ]
    }
  });
}

async function checkChannelMembership(botToken, channelUsername, userId) {
  try {
    const url = `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${encodeURIComponent(channelUsername)}&user_id=${userId}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.ok) return true;
    const status = data.result.status;
    return ['creator', 'administrator', 'member'].includes(status);
  } catch (e) {
    console.error('checkChannelMembership xatolik:', e);
    return true;
  }
}

function getSupabaseAdmin() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

async function saveSubscriber(chatId, telegramId, firstName, username) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    await supabaseAdmin.from('telegram_subscribers').upsert({
      chat_id: chatId,
      telegram_id: telegramId,
      first_name: firstName,
      username,
      updated_at: new Date().toISOString()
    });
  } catch (e) {
    console.error('saveSubscriber xatolik:', e);
  }
}

async function broadcastToAll(botToken, text) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: subscribers, error } = await supabaseAdmin.from('telegram_subscribers').select('chat_id');
  if (error || !subscribers) return { sent: 0, failed: 0, total: 0 };

  let sent = 0;
  let failed = 0;

  for (const sub of subscribers) {
    try {
      const result = await sendMessage(botToken, sub.chat_id, { text });
      if (result && result.ok) sent++;
      else failed++;
    } catch (e) {
      failed++;
    }
    await new Promise((r) => setTimeout(r, 40));
  }

  return { sent, failed, total: subscribers.length };
}

async function sendMessage(botToken, chatId, payload) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, ...payload })
  });
  return res.json();
}

async function answerCallbackQuery(botToken, callbackQueryId) {
  const url = `https://api.telegram.org/bot${botToken}/answerCallbackQuery`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId })
  });
}
