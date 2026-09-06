// /api/payment-reminder.js
// "💳 To'lov qilish" tugmasini bosgan, lekin 6 soatdan beri screenshot
// yubormagan foydalanuvchilarga bitta eslatma yuboradi.
// Har biriga FAQAT BIR MARTA eslatma boradi (reminded_at orqali nazorat qilinadi).
//
// KERAKLI MUHIT O'ZGARUVCHILARI (Vercel):
//   TELEGRAM_BOT_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET
//
// VERCEL CRON (vercel.json'ga qo'shing) — har soatda bir tekshiradi:
//   { "path": "/api/payment-reminder", "schedule": "0 * * * *" }

const { createClient } = require('@supabase/supabase-js');

const REMIND_AFTER_HOURS = 6;

module.exports = async (req, res) => {
  try {
    const CRON_SECRET = process.env.CRON_SECRET;
    const authHeader = req.headers['authorization'] || '';
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return res.status(401).json({ error: 'Ruxsat yo\'q' });
    }

    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const cutoff = new Date(Date.now() - REMIND_AFTER_HOURS * 60 * 60 * 1000).toISOString();

    const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: pending, error } = await supabaseAdmin
      .from('pending_payments')
      .select('telegram_id, chat_id, first_name')
      .lte('clicked_at', cutoff)
      .is('reminded_at', null);

    if (error) {
      return res.status(500).json({ error: 'Ma\'lumot olishda xatolik', details: error.message });
    }

    let sent = 0;

    for (const p of pending || []) {
      const name = p.first_name || 'Tarbiyachi';
      const result = await sendMessage(BOT_TOKEN, p.chat_id, {
        text:
          `👋 ${name}, to'lovni yakunlamadingizmi?\n\n` +
          `To'lov qilgan bo'lsangiz, shu yerga skrinshotini yuborishingiz kifoya — Premium darhol faollashtiriladi.\n\n` +
          `Savol bo'lsa, @AzadiB_way ga yozing.`,
        reply_markup: {
          inline_keyboard: [[{ text: '💳 To\'lov qilish', callback_data: 'pay_premium' }]]
        }
      });

      if (result && result.ok) {
        sent++;
        await supabaseAdmin
          .from('pending_payments')
          .update({ reminded_at: new Date().toISOString() })
          .eq('telegram_id', p.telegram_id);
      }
      await new Promise((r) => setTimeout(r, 40));
    }

    return res.status(200).json({ ok: true, checked: (pending || []).length, sent });
  } catch (e) {
    console.error('payment-reminder xatolik:', e);
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
