// /lib/certificate.js
// Sertifikat rasmini (PNG) generatsiya qiladi va Telegram'ga yuboradi.
// Bu fayl /api/telegram-webhook.js (buyruq orqali) va
// /api/generate-certificate.js (sayt orqali) tomonidan ishlatiladi.
//
// KERAKLI NPM PAKET: @resvg/resvg-js
// package.json'dagi "dependencies" ichiga qo'shing:
//   "@resvg/resvg-js": "^2.6.2"
//
// KERAKLI FAYLLAR: /fonts/DejaVuSerif-Bold.ttf, /fonts/DejaVuSans.ttf,
// /fonts/DejaVuSans-Bold.ttf — repo ROOT'ida "fonts" papkasida bo'lishi kerak.
// (sharp/librsvg server muhitida shrift topa olmay, harflar o'rniga bo'sh
// kvadratcha chiqargani uchun endi shriftni o'zimiz bilan olib yuramiz.)

const path = require('path');
const fs = require('fs');
const { Resvg } = require('@resvg/resvg-js');

const FONTS_DIR = path.join(__dirname, '..', 'fonts');

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildCertificateSvg({ name, score, testName, dateStr }) {
  const safeName = escapeXml(name || 'Tarbiyachi');
  const safeTest = escapeXml(testName || 'Attestatsiya testi');
  const safeScore = escapeXml(score != null ? String(score) : '—');
  const safeDate = escapeXml(dateStr || '');

  return `
<svg width="1200" height="800" viewBox="0 0 1200 800" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#6C5CE7"/>
      <stop offset="50%" stop-color="#5B4FE8"/>
      <stop offset="100%" stop-color="#3B82F6"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#FFD166"/>
      <stop offset="100%" stop-color="#FF9F43"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="28" flood-color="#1e1b4b" flood-opacity="0.35"/>
    </filter>
  </defs>

  <rect width="1200" height="800" fill="url(#bg)"/>

  <!-- Fon bezaklari (yumaloq shakllar) -->
  <circle cx="90" cy="90" r="140" fill="#ffffff" opacity="0.06"/>
  <circle cx="1130" cy="720" r="180" fill="#ffffff" opacity="0.06"/>
  <circle cx="1080" cy="120" r="70" fill="#FFD166" opacity="0.15"/>
  <circle cx="120" cy="700" r="50" fill="#FFD166" opacity="0.12"/>

  <!-- Markaziy kartochka -->
  <rect x="90" y="70" width="1020" height="660" rx="32" fill="#ffffff" filter="url(#shadow)"/>

  <!-- Yuqori aksent chiziq -->
  <rect x="90" y="70" width="1020" height="10" rx="5" fill="url(#accent)"/>

  <!-- Nishon (badge) -->
  <circle cx="600" cy="185" r="52" fill="url(#accent)"/>
  <path d="M600 155 L611 178 L636 181 L618 199 L622 224 L600 212 L578 224 L582 199 L564 181 L589 178 Z" fill="#ffffff"/>

  <!-- Sarlavha -->
  <text x="600" y="278" font-family="DejaVu Sans" font-size="26" font-weight="bold" fill="#6C5CE7" text-anchor="middle" letter-spacing="6">SERTIFIKAT</text>

  <!-- Ism -->
  <text x="600" y="360" font-family="DejaVu Sans" font-size="54" font-weight="bold" fill="#1e1b4b" text-anchor="middle">${safeName}</text>

  <!-- Ajratuvchi -->
  <rect x="520" y="392" width="160" height="5" rx="2.5" fill="url(#accent)"/>

  <!-- Matn -->
  <text x="600" y="450" font-family="DejaVu Sans" font-size="22" fill="#64748b" text-anchor="middle">quyidagi testni muvaffaqiyatli yakunladi</text>
  <text x="600" y="488" font-family="DejaVu Sans" font-size="26" font-weight="bold" fill="#3B82F6" text-anchor="middle">${safeTest}</text>

  <!-- Ball kartochkasi -->
  <rect x="470" y="530" width="260" height="130" rx="24" fill="#F5F3FF"/>
  <text x="600" y="605" font-family="DejaVu Sans" font-size="56" font-weight="bold" fill="#6C5CE7" text-anchor="middle">${safeScore}</text>
  <text x="600" y="635" font-family="DejaVu Sans" font-size="16" font-weight="bold" fill="#8b7ff0" text-anchor="middle" letter-spacing="3">NATIJA</text>

  <!-- Pastki qism: sana va brend -->
  <text x="600" y="700" font-family="DejaVu Sans" font-size="16" fill="#94a3b8" text-anchor="middle">${safeDate}</text>
  <text x="600" y="726" font-family="DejaVu Sans" font-size="20" font-weight="bold" fill="#1e1b4b" text-anchor="middle" letter-spacing="2">MaktabgachaHub</text>
</svg>`.trim();
}

async function renderCertificatePng(params) {
  const svg = buildCertificateSvg(params);

  const fontFiles = [
    path.join(FONTS_DIR, 'DejaVuSerif-Bold.ttf'),
    path.join(FONTS_DIR, 'DejaVuSans.ttf'),
    path.join(FONTS_DIR, 'DejaVuSans-Bold.ttf')
  ].filter((p) => fs.existsSync(p));

  const resvg = new Resvg(svg, {
    font: {
      fontFiles,
      loadSystemFonts: false,
      defaultFontFamily: 'DejaVu Sans'
    },
    background: 'rgba(0,0,0,0)'
  });

  const pngData = resvg.render();
  return pngData.asPng();
}

// Telegram'ga rasm sifatida yuboradi (fayl sifatida, file_id emas —
// chunki rasm har safar yangidan generatsiya qilinadi)
async function sendCertificatePhoto(botToken, chatId, pngBuffer, caption, replyMarkup) {
  const form = new FormData();
  form.append('chat_id', String(chatId));
  if (caption) form.append('caption', caption);
  if (replyMarkup) form.append('reply_markup', JSON.stringify(replyMarkup));
  form.append('photo', new Blob([pngBuffer], { type: 'image/png' }), 'sertifikat.png');

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
    method: 'POST',
    body: form
  });
  return res.json();
}

function formatDate(date) {
  const months = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

module.exports = { renderCertificatePng, sendCertificatePhoto, formatDate };
