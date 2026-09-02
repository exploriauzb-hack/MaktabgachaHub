// /api/telegram-auth.js
// Telegram WebApp initData'ni tekshiradi, kanalga a'zolikni tasdiqlaydi,
// mos Supabase foydalanuvchisini topadi (yoki yaratadi) va session qaytaradi.
//
// KERAKLI MUHIT O'ZGARUVCHILARI (Vercel):
//   TELEGRAM_BOT_TOKEN        — BotFather bergan token
//   SUPABASE_URL              — https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY — Supabase service_role kaliti (MAXFIY)
//   SUPABASE_ANON_KEY         — Supabase anon key
//   TG_AUTH_SECRET            — uzun tasodifiy maxfiy satr
//   CHANNEL_USERNAME          — masalan @MaktabgachaHub (majburiy obuna kanali)

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

function verifyTelegramInitData(initData, botToken) {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return false;
  params.delete('hash');

  const pairs = [];
  for (const [key, value] of params.entries()) pairs.push([key, value]);
  pairs.sort((a, b) => a[0].localeCompare(b[0]));
  const dataCheckString = pairs.map(([k, v]) => `${k}=${v}`).join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  const a = Buffer.from(computedHash, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

async function checkChannelMembership(botToken, channelUsername, userId) {
  try {
    const url = `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${encodeURIComponent(channelUsername)}&user_id=${userId}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.ok) return true; // API xatosida bloklamaymiz (masalan bot admin emas)
    const status = data.result.status;
    return ['creator', 'administrator', 'member'].includes(status);
  } catch (e) {
    return true;
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Faqat POST so\'rov qabul qilinadi' });
  }

  try {
    const { initData } = req.body || {};
    if (!initData) {
      return res.status(400).json({ error: 'initData yuborilmagan' });
    }

    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (!verifyTelegramInitData(initData, BOT_TOKEN)) {
      return res.status(401).json({ error: 'initData tekshiruvi muvaffaqiyatsiz — soxta so\'rov bo\'lishi mumkin' });
    }

    const params = new URLSearchParams(initData);
    const authDate = parseInt(params.get('auth_date'), 10);
    const nowSec = Math.floor(Date.now() / 1000);
    if (!authDate || nowSec - authDate > 86400) {
      return res.status(401).json({ error: 'initData eskirgan, sahifani qayta oching' });
    }

    const userRaw = params.get('user');
    if (!userRaw) {
      return res.status(400).json({ error: 'Telegram foydalanuvchi ma\'lumoti topilmadi' });
    }
    const tgUser = JSON.parse(userRaw);
    const telegramId = tgUser.id;
    const fullName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || 'Tarbiyachi';

    // ═══ Majburiy kanalga obuna tekshiruvi ═══
    const CHANNEL_USERNAME = process.env.CHANNEL_USERNAME || '@MaktabgachaHub';
    const isMember = await checkChannelMembership(BOT_TOKEN, CHANNEL_USERNAME, telegramId);
    if (!isMember) {
      return res.status(403).json({
        error: 'not_subscribed',
        channel: CHANNEL_USERNAME,
        message: `Saytdan foydalanish uchun avval ${CHANNEL_USERNAME} kanaliga a'zo bo'ling.`
      });
    }

    const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const supabaseAnon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

    const email = `tg${telegramId}@telegram.maktabgachahub.website`;
    const password = crypto
      .createHmac('sha256', process.env.TG_AUTH_SECRET)
      .update(String(telegramId))
      .digest('hex');

    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    let userId;

    if (existingProfile) {
      userId = existingProfile.id;
    } else {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { telegram_id: telegramId, full_name: fullName }
      });
      if (createErr) {
        return res.status(500).json({ error: 'Foydalanuvchi yaratishda xatolik: ' + createErr.message });
      }
      userId = created.user.id;

      await supabaseAdmin
        .from('profiles')
        .update({ telegram_id: telegramId, full_name: fullName })
        .eq('id', userId);
    }

    const { data: signInData, error: signInErr } = await supabaseAnon.auth.signInWithPassword({
      email,
      password
    });
    if (signInErr) {
      return res.status(500).json({ error: 'Session yaratishda xatolik: ' + signInErr.message });
    }

    return res.status(200).json({
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token
    });
  } catch (e) {
    console.error('telegram-auth xatolik:', e);
    return res.status(500).json({ error: 'Kutilmagan server xatoligi' });
  }
};
