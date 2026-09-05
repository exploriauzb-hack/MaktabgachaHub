// /api/telegram-webhook.js
// Telegram bot Update'larini qabul qiladi:
//  - Har qanday xabar → foydalanuvchi telegram_subscribers jadvaliga yoziladi (faqat /start'da)
//  - /start → AVVAL kanalga a'zolik tekshiriladi. A'zo bo'lmasa — a'zo bo'lish
//    havolasi va "✅ Tekshirish" tugmasi bilan xabar ko'rsatiladi.
//    A'zo bo'lsa — salomlashuv + "🌐 Saytga o'tish" + Premium/Manba tugmalari.
//  - /start ref_<id> → agar shu foydalanuvchi ilgari hech kim tomonidan taklif
//    qilinmagan bo'lsa, referal sifatida qayd etiladi va taklif qilgan odamga
//    xabar boradi (5 tada — chegirma, 10 tada — bepul Premium haqida eslatma).
//  - "🎁 Do'st taklif qilish" tugmasi → foydalanuvchiga shaxsiy havola va
//    hozirgi taklif qilganlar sonini ko'rsatadi.
//  - "🏆 Reyting" tugmasi → eng ko'p taklif qilgan top-10 foydalanuvchini
//    va so'rovchining o'z o'rnini ko'rsatadi.
//  - "check_subscription" callback → qayta tekshiradi
//  - "⭐ Premium" / "📖 Manba" → mos ma'lumot
//  - /elon <matn> → FAQAT ADMIN uchun: barcha obunachilarga shu matnni yuboradi
//  - RASM + izohda "/elon <matn>" → FAQAT ADMIN uchun: barcha obunachilarga
//    shu rasm va matnni birga yuboradi (sendPhoto)
//
// KERAKLI MUHIT O'ZGARUVCHILARI (Vercel):
//   TELEGRAM_BOT_TOKEN        — BotFather bergan token
//   APP_URL                    — masalan https://www.maktabgachahub.website
//   BOT_USERNAME                — bot username, @ belgisiz (masalan MaktabgachaHubBot) — referal havolasi uchun
//   SUPABASE_URL               — loyihangiz URL manzili
//   SUPABASE_SERVICE_ROLE_KEY  — Supabase service_role kaliti
//   ADMIN_TELEGRAM_ID          — sizning shaxsiy Telegram ID raqamingiz
//   CHANNEL_USERNAME           — masalan @MaktabgachaHub

const { createClient } = require('@supabase/supabase-js');

const PREMIUM_BTN = '⭐ Premium';
const MANBA_BTN = '📖 Manba';
const REFERRAL_BTN = '🎁 Do\'st taklif qilish';
const LEADERBOARD_BTN = '🏆 Reyting';

const REFERRAL_DISCOUNT_THRESHOLD = 5;
const REFERRAL_PREMIUM_THRESHOLD = 10;
const REFERRAL_PREMIUM_MONTHS = 1; // har 10 ta yangi referal uchun necha oy bepul Premium beriladi

const PREMIUM_INFO_TEXT =
  `⭐ <b>Premium haqida</b>\n\n` +
  `MaktabgachaHub 3 ta tarifda ishlaydi:\n\n` +
  `🆓 <b>Bepul</b> — asosiy testlar va materiallarga kirish\n\n` +
  `⭐ <b>Professional</b> — 49 000 so'm/oy\n` +
  `— Barcha test va attestatsiya bo'limlari\n` +
  `— Qo'shiqlar, o'yinlar, mashg'ulotlar\n` +
  `— Cheksiz foydalanish\n\n` +
  `🎉 <b>5 oylik obuna — 60 000 so'm</b> (tejamli aksiya narxi)\n\n` +
  `Obuna bo'lish uchun @AzadiB_way ga yozing.\n\n` +
  `💡 Yoki do'stlaringizni taklif qilib, chegirma yoki bepul Premium qo'lga kiriting — "🎁 Do'st taklif qilish" tugmasini bosing.`;

const MANBA_INFO_TEXT =
  `🔥 Qog'ozbozlik va izlanishga sarflanadigan soatlab vaqtingizni tejang!\n\n` +
  `"Manba" — tarbiyachilar uchun tayyor amaliy yechimlar va doimiy yangilanuvchi metodik adabiyotlar platformasi.\n\n` +
  `📚 Nol nazariya, 100% amaliyot: Aniq qadamlar va oson tushuntirilgan me'yoriy hujjatlar.\n\n` +
  `📝 Tezkor testlar: Bilimingizni darhol tekshirib, o'sishingizni kuzating.\n` +
  `⚡️ Doimiy yangilanish: Ishingiz uchun zarur barcha resurslar har doim qo'lingiz ostida.\n\n` +
  `Professional faoliyatingizni bugundanoq yengillashtiring!\n\n` +
  `Obunani faollashtirish uchun @AzadiB_way ga murojaat qiling.`;

const MAIN_KEYBOARD = {
  keyboard: [[{ text: PREMIUM_BTN }, { text: MANBA_BTN }], [{ text: REFERRAL_BTN }, { text: LEADERBOARD_BTN }]],
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
    if (!message) {
      return res.status(200).json({ ok: true });
    }

    const chatId = message.chat.id;
    // Matn oddiy xabarda `text`da, rasm izohida esa `caption`da keladi
    const rawText = message.text || message.caption || '';
    const text = rawText.trim();
    const [command, payload] = text.split(' ');
    const firstName = message.from?.first_name || 'Tarbiyachi';
    const username = message.from?.username || null;
    const senderId = message.from?.id;
    const hasPhoto = Array.isArray(message.photo) && message.photo.length > 0;

    // ═══ ADMIN: e'lon yuborish (matn yoki RASM + matn) ═══
    if (text.startsWith('/elon')) {
      if (!ADMIN_ID || String(senderId) !== String(ADMIN_ID)) {
        await sendMessage(BOT_TOKEN, chatId, { text: 'Bu buyruq faqat admin uchun.' });
        return res.status(200).json({ ok: true });
      }

      const announceText = text.replace('/elon', '').trim();

      if (hasPhoto) {
        // Eng katta o'lchamdagi rasm file_id'sini olamiz
        const fileId = message.photo[message.photo.length - 1].file_id;
        const result = await broadcastPhotoToAll(BOT_TOKEN, fileId, announceText);
        await sendMessage(BOT_TOKEN, chatId, {
          text: `✅ Rasmli e'lon yuborildi.\nJami obunachi: ${result.total}\nYuborildi: ${result.sent}\nXato (bloklangan/o'chirilgan): ${result.failed}`
        });
        return res.status(200).json({ ok: true });
      }

      if (!announceText) {
        await sendMessage(BOT_TOKEN, chatId, {
          text:
            'Foydalanish:\n' +
            '• Matn: /elon Xabar matni\n' +
            '• Rasm bilan: rasmni yuboring, izohga (caption) "/elon Xabar matni" deb yozing'
        });
        return res.status(200).json({ ok: true });
      }

      const result = await broadcastToAll(BOT_TOKEN, announceText);
      await sendMessage(BOT_TOKEN, chatId, {
        text: `✅ E'lon yuborildi.\nJami obunachi: ${result.total}\nYuborildi: ${result.sent}\nXato (bloklangan/o'chirilgan): ${result.failed}`
      });
      return res.status(200).json({ ok: true });
    }

    // Rasm bilan lekin /elon bo'lmagan izoh — e'tiborsiz qoldiramiz
    if (hasPhoto) {
      return res.status(200).json({ ok: true });
    }

    if (!message.text) {
      return res.status(200).json({ ok: true });
    }

    if (command === '/start') {
      const results = await Promise.all([
        checkChannelMembership(BOT_TOKEN, CHANNEL_USERNAME, senderId),
        saveSubscriber(chatId, senderId, firstName, username)
      ]);
      const isMember = results[0];

      if (isMember) {
        await sendWelcomeFlow(BOT_TOKEN, chatId, firstName, APP_URL);

        // ═══ REFERAL TIZIMI: agar havola orqali kirgan bo'lsa ═══
        if (payload && payload.startsWith('ref_')) {
          const referrerId = payload.replace('ref_', '');
          const inserted = await recordReferral(referrerId, senderId);
          if (inserted) {
            const newCount = await getReferralCount(referrerId);
            await notifyReferrer(BOT_TOKEN, referrerId, firstName, newCount);
          }
        }
      } else {
        await sendSubscribeGate(BOT_TOKEN, chatId, CHANNEL_USERNAME);
      }
    } else if (text === PREMIUM_BTN || text === '/premium') {
      await sendMessage(BOT_TOKEN, chatId, { text: PREMIUM_INFO_TEXT, parse_mode: 'HTML', reply_markup: MAIN_KEYBOARD });
    } else if (text === MANBA_BTN || text === '/manba') {
      await sendMessage(BOT_TOKEN, chatId, { text: MANBA_INFO_TEXT, parse_mode: 'HTML', reply_markup: MAIN_KEYBOARD });
    } else if (text === REFERRAL_BTN || text === '/referral') {
      await sendReferralInfo(BOT_TOKEN, chatId, senderId);
    } else if (text === LEADERBOARD_BTN || text === '/reyting') {
      await sendLeaderboard(BOT_TOKEN, chatId, senderId);
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
      text: '⭐ Premium, 📖 Manba va 🎁 Do\'st taklif qilish haqida ma\'lumot uchun pastdagi tugmalardan foydalaning.',
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

// ═══ REFERAL TIZIMI: yordamchi funksiyalar ═══

async function sendReferralInfo(botToken, chatId, senderId) {
  const botUsername = process.env.BOT_USERNAME;
  const link = botUsername
    ? `https://t.me/${botUsername}?start=ref_${senderId}`
    : null;
  const count = await getReferralCount(senderId);
  const toDiscount = Math.max(0, REFERRAL_DISCOUNT_THRESHOLD - count);
  const toPremium = Math.max(0, REFERRAL_PREMIUM_THRESHOLD - count);

  const linkLine = link
    ? `🔗 Shaxsiy havolangiz:\n${link}\n\n`
    : '';

  const discountLine =
    count >= REFERRAL_DISCOUNT_THRESHOLD
      ? `✅ Chegirmaga haqlisiz — @AzadiB_way ga yozib, "referal" deb ayting!\n`
      : `⭐ Yana ${toDiscount} ta taklif — Premium narxiga chegirmaga ega bo'lasiz\n`;

  const premiumLine =
    count >= REFERRAL_PREMIUM_THRESHOLD
      ? `🏆 ${REFERRAL_PREMIUM_MONTHS} oylik BEPUL Premium'ga haqlisiz — @AzadiB_way ga yozib, "referal" deb ayting!`
      : `🏆 Yana ${toPremium} ta taklif — ${REFERRAL_PREMIUM_MONTHS} oylik BEPUL Premium qo'lga kiritasiz`;

  await sendMessage(botToken, chatId, {
    text:
      `🎁 <b>Do'stlaringizni taklif qiling!</b>\n\n` +
      linkLine +
      `Havolangiz orqali kirgan har bir do'stingiz hisobga qo'shiladi.\n\n` +
      `📊 Hozirgi taklif qilganlaringiz: <b>${count} ta</b>\n\n` +
      `${discountLine}` +
      `${premiumLine}\n\n` +
      `🏆 Bundan tashqari: har oy eng ko'p taklif qilgan TOP-3 ishtirokchi ham 1 oylik BEPUL Premium yutadi! ` +
      `"🏆 Reyting" tugmasi orqali kim yetakchi ekanini kuzatib boring.`,
    parse_mode: 'HTML',
    reply_markup: MAIN_KEYBOARD
  });
}

async function recordReferral(referrerId, referredId) {
  if (!referrerId || String(referrerId) === String(referredId)) return false;
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from('referrals')
      .insert({ referrer_telegram_id: referrerId, referred_telegram_id: referredId });
    // xato bo'lsa (masalan bu odam ilgari boshqa referal orqali kirgan) — jim o'tkazamiz
    return !error;
  } catch (e) {
    console.error('recordReferral xatolik:', e);
    return false;
  }
}

async function getReferralCount(referrerId) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { count, error } = await supabaseAdmin
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_telegram_id', referrerId);
    if (error) return 0;
    return count || 0;
  } catch (e) {
    console.error('getReferralCount xatolik:', e);
    return 0;
  }
}

async function notifyReferrer(botToken, referrerId, newFriendName, count) {
  let extra = '';
  if (count === REFERRAL_DISCOUNT_THRESHOLD) {
    extra =
      `\n\n🎉 Tabriklaymiz! Siz ${REFERRAL_DISCOUNT_THRESHOLD} ta do'stingizni taklif qildingiz — ` +
      `endi Premium narxiga chegirmaga haqlisiz. @AzadiB_way ga yozib, "referal" deb ayting.`;
  } else if (count === REFERRAL_PREMIUM_THRESHOLD) {
    extra =
      `\n\n🏆 Ajoyib! ${REFERRAL_PREMIUM_THRESHOLD} ta do'stingiz botga qo'shildi — ` +
      `siz ${REFERRAL_PREMIUM_MONTHS} oylik BEPUL Premium'ga haqlisiz! @AzadiB_way ga yozib, "referal" deb ayting.`;
  }

  await sendMessage(botToken, referrerId, {
    text:
      `✅ ${newFriendName} sizning havolangiz orqali botga qo'shildi!\n\n` +
      `Hozircha jami taklif qilganlaringiz: <b>${count} ta</b>.` +
      extra,
    parse_mode: 'HTML'
  });
}

async function getLeaderboard() {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('referral_leaderboard')
      .select('referrer_telegram_id, referral_count, first_name')
      .order('referral_count', { ascending: false });
    if (error || !data) return [];
    return data;
  } catch (e) {
    console.error('getLeaderboard xatolik:', e);
    return [];
  }
}

async function sendLeaderboard(botToken, chatId, senderId) {
  const all = await getLeaderboard();

  if (all.length === 0) {
    await sendMessage(botToken, chatId, {
      text: '🏆 Hali hech kim do\'st taklif qilmagan. Birinchi bo\'ling — "🎁 Do\'st taklif qilish" tugmasini bosing!',
      reply_markup: MAIN_KEYBOARD
    });
    return;
  }

  const medals = ['🥇', '🥈', '🥉'];
  const top = all.slice(0, 10);
  const lines = top.map((row, i) => {
    const rankLabel = medals[i] || `${i + 1}.`;
    const name = row.first_name || 'Tarbiyachi';
    return `${rankLabel} ${name} — ${row.referral_count} ta`;
  });

  const myIndex = all.findIndex((r) => String(r.referrer_telegram_id) === String(senderId));
  let myLine = '';
  if (myIndex === -1) {
    myLine = `\n\nSiz hali reytingda yo'qsiz — birinchi do'stingizni taklif qiling! 🎁`;
  } else if (myIndex >= 10) {
    myLine = `\n\n📍 Sizning o'rningiz: #${myIndex + 1} (${all[myIndex].referral_count} ta)`;
  }

  await sendMessage(botToken, chatId, {
    text: `🏆 <b>Eng ko'p taklif qilganlar</b>\n\n${lines.join('\n')}${myLine}`,
    parse_mode: 'HTML',
    reply_markup: MAIN_KEYBOARD
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

// Rasm + izoh (caption) ni barcha obunachilarga yuboradi
async function broadcastPhotoToAll(botToken, fileId, caption) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: subscribers, error } = await supabaseAdmin.from('telegram_subscribers').select('chat_id');
  if (error || !subscribers) return { sent: 0, failed: 0, total: 0 };

  let sent = 0;
  let failed = 0;

  for (const sub of subscribers) {
    try {
      const result = await sendPhoto(botToken, sub.chat_id, fileId, caption);
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

async function sendPhoto(botToken, chatId, fileId, caption) {
  const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      photo: fileId,
      caption: caption || undefined
    })
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
