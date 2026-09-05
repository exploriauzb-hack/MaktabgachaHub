// /api/monthly-referral-reward.js
// Har oyning 1-kuni ishga tushib, O'TGAN OY uchun eng ko'p do'st taklif qilgan
// TOP-3 foydalanuvchiga "1 oylik BEPUL Premium yutdingiz" xabarini yuboradi
// va adminga kim-kimligi haqida hisobot beradi (Premium'ni qo'lda faollashtirish uchun).
//
// KERAKLI MUHIT O'ZGARUVCHILARI (Vercel):
//   TELEGRAM_BOT_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//   ADMIN_TELEGRAM_ID, CRON_SECRET
//
// VERCEL CRON (vercel.json'ga qo'shing):
//   { "path": "/api/monthly-referral-reward", "schedule": "10 4 1 * *" }
//   Bu — har oyning 1-kuni, soat 04:10 UTC = 09:10 O'zbekiston vaqti degani.

const { createClient } = require('@supabase/supabase-js');

const TOP_N = 3;
const MEDALS = ['🥇', '🥈', '🥉'];

const MONTH_NAMES = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
];

module.exports = async (req, res) => {
  try {
    const CRON_SECRET = process.env.CRON_SECRET;
    const authHeader = req.headers['authorization'] || '';
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return res.status(401).json({ error: 'Ruxsat yo\'q' });
    }

    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const ADMIN_ID = process.env.ADMIN_TELEGRAM_ID;

    const now = new Date();
    const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
    const prevMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0));
    const label = `${MONTH_NAMES[prevMonthStart.getUTCMonth()]} ${prevMonthStart.getUTCFullYear()}`;

    const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: rows, error } = await supabaseAdmin.rpc('get_referral_counts', {
      start_date: prevMonthStart.toISOString(),
      end_date: currentMonthStart.toISOString()
    });

    if (error) {
      return res.status(500).json({ error: 'Hisoblashda xatolik', details: error.message });
    }

    const winners = (rows || []).slice(0, TOP_N);

    if (winners.length === 0) {
      if (ADMIN_ID) {
        await sendMessage(BOT_TOKEN, ADMIN_ID, {
          text: `📊 ${label} uchun referal g'oliblari yo'q — bu oy hech kim do'st taklif qilmagan.`
        });
      }
      return res.status(200).json({ ok: true, month: label, winners: 0 });
    }

    for (let i = 0; i < winners.length; i++) {
      const w = winners[i];
      const medal = MEDALS[i] || `${i + 1}.`;
      const name = w.first_name || 'Tarbiyachi';
      await sendMessage(BOT_TOKEN, w.referrer_telegram_id, {
        text:
          `${medal} Tabriklaymiz, ${name}!\n\n` +
          `${label} oyida eng ko'p do'st taklif qilganlar reytingida <b>${i + 1}-o'rinni</b> egalladingiz — ` +
          `${w.referral_count} ta referal bilan! 🎉\n\n` +
          `🎁 Sizga <b>1 oylik BEPUL Premium</b> in'om etildi. Buni faollashtirish uchun @AzadiB_way ga yozib, ` +
          `"${label} oyi g'olibiman" deb ayting.`,
        parse_mode: 'HTML'
      });
      await new Promise((r) => setTimeout(r, 40));
    }

    if (ADMIN_ID) {
      const summary = winners
        .map((w, i) => `${MEDALS[i] || `${i + 1}.`} ${w.first_name || 'Tarbiyachi'} (ID: ${w.referrer_telegram_id}) — ${w.referral_count} ta`)
        .join('\n');
      await sendMessage(BOT_TOKEN, ADMIN_ID, {
        text: `🏆 <b>${label}</b> oyi referal g'oliblari (1 oylik Premium qo'lda berilishi kerak):\n\n${summary}`,
        parse_mode: 'HTML'
      });
    }

    return res.status(200).json({ ok: true, month: label, winners: winners.length });
  } catch (e) {
    console.error('monthly-referral-reward xatolik:', e);
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
